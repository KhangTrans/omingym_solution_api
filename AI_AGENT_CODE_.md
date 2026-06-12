# AI Agent Code Style Guide - OmniGym Project

File này dùng cho AI Agent/dev đọc trước khi code chức năng mới để giữ style code đồng nhất với project. Ưu tiên follow style của module **Trainer Application** vì module này đang có cấu trúc tương đối rõ nhất.

---

## 1. Nguyên tắc chung

- Code theo flow rõ ràng: **Frontend Page/Component → API layer → Backend Route → Controller → Service → Entity/Database**.
- Không gọi API trực tiếp rải rác trong UI nếu có thể tách vào `src/api/*`.
- Backend không để business logic dài trong route/controller. Controller chỉ nhận request, validate cơ bản, gọi service, trả response.
- Service là nơi xử lý nghiệp vụ chính.
- Nếu có trạng thái nghiệp vụ, dùng enum thay vì hard-code string nhiều nơi.
- Message nên ưu tiên tiếng Việt cho backend response và toast nếu màn hình đang dùng tiếng Việt.
- Không dùng `any` nếu có thể định nghĩa type/interface rõ ràng.

---

## 2. Cấu trúc frontend chuẩn

Khi thêm chức năng mới, nên có các phần:

```txt
src/pages/.../FeaturePage.tsx
src/api/feature.ts
src/components/.../FeatureComponent.tsx  // nếu component dùng lại được
src/types/...                         // nếu type lớn hoặc dùng nhiều nơi
```

Ví dụ style tốt:

```txt
src/pages/pubblic/TrainerJoin.tsx
src/api/trainerApplications.ts
src/components/site/ImageUpload.tsx
```

### 2.1 API layer frontend

Không gọi `axios` trực tiếp trong page nếu API đó dùng cho chức năng riêng. Tạo file trong `src/api`.

Ví dụ:

```ts
import api from "./axios";

export const trainerApplicationAPI = {
  saveDraft: (payload: any) => api.post("/trainer-applications/draft", payload),
  submit: (payload: any) => api.post("/trainer-applications", payload),
  getMe: () => api.get("/trainer-applications/me"),
  approve: (id: number) => api.patch(`/trainer-applications/${id}/approve`),
  reject: (id: number, rejection_reason: string) =>
    api.patch(`/trainer-applications/${id}/reject`, { rejection_reason }),
};
```

Khi code mới, nên hạn chế `payload: any`; nếu có thời gian thì tạo type:

```ts
type CreateFeaturePayload = {
  name: string;
  description?: string;
};
```

### 2.2 Page/component frontend

Trong page nên tách rõ:

```txt
state
useEffect load data
helper setField/buildPayload
handler submit/save/update/delete
render theo status/loading/error
```

Style handler:

```ts
async function submit() {
  if (submitting) return;

  if (!requiredField.trim()) {
    return toast.error("Vui lòng nhập thông tin bắt buộc.");
  }

  try {
    setSubmitting(true);
    const response = await featureAPI.create(payload);
    setData(response.data.data);
    toast.success("Thao tác thành công.");
  } catch (error: any) {
    const message = error.response?.data?.message || "Thao tác thất bại.";
    toast.error(message);
  } finally {
    setSubmitting(false);
  }
}
```

### 2.3 Upload ảnh frontend

Nếu chức năng cần upload ảnh, dùng lại component:

```txt
src/components/site/ImageUpload.tsx
```

Flow chuẩn:

```txt
User chọn ảnh
→ ImageUpload validate file ảnh và dung lượng
→ uploadImageToCloudinary(file)
→ Cloudinary trả secure_url
→ set URL vào form state
→ submit form chỉ gửi URL ảnh về backend
```

Không tự viết upload mới nếu không cần. Backend hiện tại chỉ lưu URL ảnh, không nhận file binary.

---

## 3. Cấu trúc backend chuẩn

Khi thêm chức năng mới, tạo/tách theo pattern:

```txt
src/routes/feature.routes.ts
src/controllers/feature.controller.ts
src/services/feature.service.ts
src/dtos/feature.dto.ts
src/models/feature.entity.ts
```

Sau đó mount route trong:

```txt
src/app.ts
```

Ví dụ:

```ts
app.use("/api/trainer-applications", trainerApplicationRoutes);
```

---

## 4. Backend route style

Route chỉ khai báo endpoint + middleware + handler.

Ví dụ:

```ts
router.post("/", isAuthenticated, createFeatureHandler);

router.get(
  "/",
  isAuthenticated,
  authorizeRole(["Admin", "Staff"]),
  getFeaturesHandler,
);

router.patch(
  "/:id/approve",
  isAuthenticated,
  authorizeRole(["Admin", "Staff"]),
  approveFeatureHandler,
);
```

Quy tắc:

- API public thật sự mới không dùng `isAuthenticated`.
- API của user đã đăng nhập dùng `isAuthenticated`.
- API quản trị dùng thêm `authorizeRole([...])`.
- Không check role trùng lặp trong service nếu middleware đã check, trừ khi đó là business rule như giới hạn theo chi nhánh.

---

## 5. Controller style

Controller nên làm các việc:

```txt
1. Lấy params/body/session
2. Validate cơ bản
3. Gọi service
4. Trả response
5. Catch error và trả status phù hợp
```

Ví dụ:

```ts
export const createFeatureHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập." });
    }

    const validationError = validateCreateFeatureBody(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await createFeature(userId, req.body);

    return res.status(201).json({
      message: "Tạo dữ liệu thành công.",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
```

### 5.1 Validation style hiện tại

Project hiện đang validate thủ công trong controller. Nếu chưa refactor sang thư viện validate, hãy giữ style rõ ràng:

```ts
const validateCreateBody = (body: any): string | null => {
  const { title, content, is_published } = body;

  if (!title || !content) {
    return "Vui lòng nhập đầy đủ thông tin.";
  }

  if (is_published !== undefined && typeof is_published !== "boolean") {
    return "Trạng thái hiển thị không hợp lệ.";
  }

  return null;
};
```

Nếu validate array, dùng `for...of` để kiểm tra từng phần tử:

```ts
for (const item of items) {
  if (!item.name) {
    return "Thông tin chưa đầy đủ.";
  }
}
```

---

## 6. Service style

Service chứa business logic và database transaction nếu thao tác nhiều bảng.

Ví dụ:

```ts
export const submitFeature = async (userId: number, dto: CreateFeatureDto) => {
  return AppDataSource.transaction(async (manager) => {
    const featureRepo = manager.getRepository(Feature);

    let feature = await featureRepo.findOne({ where: { user_id: userId } });

    if (!feature) {
      feature = featureRepo.create({ user_id: userId });
    }

    feature.name = dto.name;
    feature.status = FeatureStatus.Pending;

    return await featureRepo.save(feature);
  });
};
```

Quy tắc:

- Nếu chỉ đọc đơn giản có thể dùng repository trực tiếp.
- Nếu create/update nhiều bảng, dùng `AppDataSource.transaction`.
- Service được phép throw `new Error("message")`; controller bắt và trả response.
- Business status phải check ở service, ví dụ chỉ được approve hồ sơ `pending`.

Ví dụ đúng:

```ts
if (application.status !== ApplicationStatus.Pending) {
  throw new Error("Chỉ có thể duyệt đơn đang chờ duyệt.");
}
```

---

## 7. Entity/DTO/Enum style

### 7.1 DTO

DTO nên đặt trong:

```txt
src/dtos/*.dto.ts
```

Ví dụ:

```ts
export class CreateFeatureDto {
  name!: string;
  description?: string;
  image_url?: string;
}
```

### 7.2 Entity

Entity đặt trong:

```txt
src/models/*.entity.ts
```

Style TypeORM:

```ts
@Entity("features")
export class Feature {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;
}
```

### 7.3 Enum

Nếu có trạng thái, dùng enum:

```ts
export enum FeatureStatus {
  Draft = "draft",
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}
```

Không rải string kiểu `"pending"`, `"approved"` nhiều nơi trong backend service.

---

## 8. Auth và role

### 8.1 Middleware

Dùng:

```ts
isAuthenticated
authorizeRole(["Admin", "Staff"])
```

Phân biệt rõ:

```txt
Middleware check quyền truy cập.
Service check điều kiện nghiệp vụ.
```

Ví dụ không dư:

```txt
Route check Admin/Staff.
Service check application.status === pending.
```

Ví dụ hơi dư:

```txt
Route đã authorizeRole(["Admin"]), service lại check user.role === "Admin" y hệt.
```

### 8.2 Trainer application role rule

Với flow Trainer Application, nên hiểu chuẩn:

```txt
User đăng ký tài khoản ban đầu nên là Customer.
User nộp hồ sơ Trainer.
Staff/Admin approve.
Backend mới update role_id = 5 để thành Trainer.
```

Không nên cho user tự thành Trainer chính thức nếu chưa approve hồ sơ.

---

## 9. API response convention

Response thành công nên có dạng:

```ts
return res.json({
  message: "Thao tác thành công.",
  data: result,
});
```

Hoặc create:

```ts
return res.status(201).json({
  message: "Tạo dữ liệu thành công.",
  data: result,
});
```

Response lỗi:

```ts
return res.status(400).json({ message: error.message });
```

Frontend đọc lỗi theo pattern:

```ts
const message = error.response?.data?.message || "Thao tác thất bại.";
toast.error(message);
```

---

## 10. Naming convention

- Backend file: `kebab-case`, ví dụ `trainer-application.service.ts`.
- Entity class: `PascalCase`, ví dụ `TrainerApplication`.
- Function: `camelCase`, ví dụ `submitTrainerApplication`.
- API object frontend: `camelCaseAPI`, ví dụ `trainerApplicationAPI`.
- Database column hiện tại dùng `snake_case`, ví dụ `created_at`, `user_id`, `image_url`.
- Frontend state field có thể dùng `snake_case` nếu map trực tiếp với backend payload.

---

## 11. Checklist trước khi commit/code xong

- [ ] Có tách frontend API layer chưa?
- [ ] Backend có đủ route/controller/service chưa?
- [ ] Controller có validate input cơ bản chưa?
- [ ] Business logic có nằm trong service chưa?
- [ ] API quản trị có `authorizeRole` chưa?
- [ ] Service có check business status cần thiết chưa?
- [ ] Response có `{ message, data }` chưa?
- [ ] Frontend có loading/submitting state chưa?
- [ ] Frontend có catch error và hiển thị message từ backend chưa?
- [ ] Nếu upload ảnh, có dùng `ImageUpload` + `uploadImageToCloudinary` chưa?
- [ ] Có tránh role check trùng lặp không cần thiết chưa?
- [ ] Có hạn chế `any` chưa?

---

## 12. Mẫu flow chức năng chuẩn

Khi thêm chức năng mới, AI Agent nên follow flow này:

```txt
1. Tạo API function ở frontend src/api/feature.ts
2. Tạo page/component gọi API đó
3. Tạo backend route trong src/routes/feature.routes.ts
4. Tạo controller trong src/controllers/feature.controller.ts
5. Tạo service trong src/services/feature.service.ts
6. Tạo DTO nếu cần
7. Tạo entity/enum nếu cần lưu DB
8. Mount route trong app.ts
9. Test flow happy path và error path
```

---

## 13. Module tham chiếu nên học theo

Ưu tiên đọc các file này trước khi code chức năng mới:

```txt
Frontend:
omnigym-solution-web/src/pages/pubblic/TrainerJoin.tsx
omnigym-solution-web/src/api/trainerApplications.ts
omnigym-solution-web/src/components/site/ImageUpload.tsx
omnigym-solution-web/src/utils/cloudinary.ts

Backend:
omingym_solution_api/src/routes/trainer-application.routes.ts
omingym_solution_api/src/controllers/trainer-application.controller.ts
omingym_solution_api/src/services/trainer-application.service.ts
omingym_solution_api/src/models/trainer-application.entity.ts
omingym_solution_api/src/models/trainer-application-certificate.entity.ts
omingym_solution_api/src/models/trainer-status.enum.ts
```

Trainer Application chưa hoàn hảo, nhưng hiện là style nên dùng làm chuẩn trong project này.


---

## 14. Convention ngôn ngữ

Do project hiện tại đang lẫn tiếng Việt và tiếng Anh, từ bây giờ AI Agent nên ưu tiên rule sau:

### 14.1 Backend response message

- Ưu tiên **tiếng Việt**.
- Ngắn, rõ, đúng nghiệp vụ.
- Không viết message quá dài.

Ví dụ:

```ts
return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
return res.status(401).json({ message: "Bạn cần đăng nhập." });
return res.status(403).json({ message: "Bạn không có quyền truy cập vào chức năng này." });
```

### 14.2 Frontend label/UI text

- Nếu màn hình hiện tại đang thiên về tiếng Việt thì tiếp tục dùng tiếng Việt đồng nhất.
- Nếu màn hình cũ đã viết gần như toàn bộ bằng tiếng Anh thì giữ tiếng Anh đồng nhất trong chính màn hình đó.
- Không trộn tiếng Việt/tiếng Anh trong cùng một cụm UI nếu không cần.

### 14.3 Toast / error message frontend

- Ưu tiên lấy message từ backend trước:

```ts
const message = error.response?.data?.message || "Thao tác thất bại.";
toast.error(message);
```

- Nếu tự viết toast ở frontend, ưu tiên đồng ngôn ngữ với màn hình đang hiển thị.

---

## 15. TypeScript rule - hạn chế `any`

Project hiện tại có dùng `any`, nhưng từ các chức năng mới AI Agent nên hạn chế tối đa.

### 15.1 Thứ tự ưu tiên

```txt
Ưu tiên 1: type/interface rõ ràng
Ưu tiên 2: unknown + narrowing
Ưu tiên 3: generic đơn giản
Cuối cùng mới dùng any
```

### 15.2 Không nên

```ts
const [user, setUser] = useState<any>(null);
```

### 15.3 Nên viết

```ts
type SessionUser = {
  id: number;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  role_id?: number;
};

const [user, setUser] = useState<SessionUser | null>(null);
```

### 15.4 Với API payload/response

Nên tạo type riêng nếu object dùng nhiều lần:

```ts
export type CreateTrainerApplicationPayload = {
  specialization: string;
  avatar_url: string;
  phone_number: string;
  address: string;
  identity_number: string;
  identity_image_url: string;
  certificates: {
    cert_name: string;
    issued_by: string;
    certificate_number: string;
    image_url: string;
    issued_at?: string | null;
    expires_at: string;
  }[];
};
```

### 15.5 Khi nào chấp nhận `any`

Chỉ dùng `any` nếu:
- dữ liệu bên thứ ba quá động,
- đang ở giai đoạn bridge code tạm thời,
- hoặc cần fix nhanh để tương thích code cũ.

Nếu dùng `any`, nên có comment ngắn giải thích.

---

## 16. Template chức năng chuẩn

Khi AI Agent tạo chức năng mới, ưu tiên follow 4 nhóm phổ biến sau.

### 16.1 Create flow

```txt
Frontend form
→ validate cơ bản
→ call POST API
→ backend controller validate
→ service create dữ liệu
→ trả { message, data }
```

Template:

```ts
async function createItem() {
  if (submitting) return;

  if (!form.name.trim()) {
    return toast.error("Vui lòng nhập tên.");
  }

  try {
    setSubmitting(true);
    const response = await itemAPI.create({ name: form.name.trim() });
    toast.success(response.data.message || "Tạo dữ liệu thành công.");
    setData(response.data.data);
  } catch (error: any) {
    const message = error.response?.data?.message || "Tạo dữ liệu thất bại.";
    toast.error(message);
  } finally {
    setSubmitting(false);
  }
}
```

### 16.2 Update flow

```txt
Load dữ liệu cũ
→ fill form
→ validate
→ call PUT/PATCH API
→ backend update
→ trả dữ liệu mới
```

Template API:

```ts
update: (id: number, payload: UpdatePayload) =>
  api.put(`/features/${id}`, payload),
```

### 16.3 List flow

```txt
Page mount
→ call GET list API
→ render loading
→ render empty state / table / cards
→ hỗ trợ reload
```

Nên có state tối thiểu:

```ts
const [items, setItems] = useState<ItemType[]>([]);
const [loading, setLoading] = useState(true);
```

### 16.4 Detail flow

```txt
Lấy id từ params
→ call GET detail API
→ render loading
→ render detail
→ handle not found/error
```

---

## 17. Pagination / Filter / Search guideline

Nếu chức năng có danh sách dữ liệu, AI Agent nên follow rule này.

### 17.1 Frontend state chuẩn

```ts
const [currentPage, setCurrentPage] = useState(1);
const [query, setQuery] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [loading, setLoading] = useState(false);
```

### 17.2 Query params

Frontend chỉ truyền param khi thực sự cần:

```ts
const params: Record<string, string | number> = {
  page: currentPage,
};

if (query.trim()) params.search = query.trim();
if (statusFilter !== "all") params.status = statusFilter;
```

### 17.3 Backend list handler

List API nên đọc params rõ ràng:

```ts
const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 10;
const search = String(req.query.search || "").trim();
const status = req.query.status ? String(req.query.status) : undefined;
```

### 17.4 Response list nên có metadata nếu có pagination

```ts
return res.json({
  data: items,
  pagination: {
    page,
    limit,
    total,
    totalPages,
  },
});
```

---

## 18. Transaction guideline khi đụng nhiều bảng

Nếu một action tác động từ 2 bảng trở lên, hoặc cần đảm bảo tính toàn vẹn dữ liệu, nên dùng transaction.

### 18.1 Nên dùng transaction khi

- tạo record cha + record con,
- approve/reject có cập nhật nhiều bảng,
- copy dữ liệu từ application sang bảng chính thức,
- delete dữ liệu cũ rồi insert dữ liệu mới,
- update role user kèm tạo hồ sơ liên quan.

### 18.2 Mẫu

```ts
return AppDataSource.transaction(async (manager) => {
  const parentRepo = manager.getRepository(Parent);
  const childRepo = manager.getRepository(Child);

  const parent = await parentRepo.save(parentRepo.create({ name: dto.name }));

  const children = dto.items.map((item) =>
    childRepo.create({ parent_id: parent.id, name: item.name }),
  );

  await childRepo.save(children);

  return { ...parent, children };
});
```

### 18.3 Không cần transaction khi

- chỉ đọc dữ liệu,
- update một bảng đơn giản,
- thao tác nhỏ không có quan hệ nhiều record.

---

## 19. Test case guideline tối thiểu

AI Agent có thể không luôn viết test tự động, nhưng khi code xong nên tự kiểm theo các case sau.

### 19.1 Happy path

- nhập dữ liệu hợp lệ,
- thao tác thành công,
- UI cập nhật đúng,
- backend trả đúng message/data.

### 19.2 Validation path

- thiếu field bắt buộc,
- sai kiểu dữ liệu,
- gửi request không hợp lệ,
- UI hiển thị lỗi đúng.

### 19.3 Permission path

- chưa đăng nhập,
- sai role,
- truy cập API quản trị bằng user thường.

### 19.4 Business rule path

Ví dụ:
- approve hồ sơ không phải `pending`,
- reject khi thiếu lý do,
- submit lại khi hồ sơ đang `approved`.

### 19.5 Upload path

- file không phải ảnh,
- file quá lớn,
- Cloudinary lỗi,
- upload thành công và lưu đúng URL.

---

## 20. Rule rõ hơn cho register Customer / Trainer

Để tránh mâu thuẫn nghiệp vụ, từ các chức năng mới AI Agent nên follow rule này:

```txt
Đăng ký tài khoản ban đầu: mặc định là Customer.
Trainer chính thức chỉ được gán sau khi hồ sơ Trainer được approve.
```

### 20.1 Quy tắc đề xuất

- Không cho người dùng tự thành Trainer chính thức ngay ở bước đăng ký tài khoản.
- Nếu UI muốn cho user chọn hướng “Tôi muốn trở thành Trainer”, thì chỉ dùng để điều hướng sang flow nộp hồ sơ Trainer sau khi tạo account.
- Backend approve Trainer application mới là nơi update role Trainer chính thức.

### 20.2 Nghĩa là

Nên ưu tiên logic này:

```txt
Register account → role Customer
Submit Trainer Application → pending
Approve Trainer Application → update role Trainer
```

Thay vì:

```txt
Register account → role Trainer ngay từ đầu
```

Nếu cần giữ tương thích code cũ, AI Agent phải tránh mở rộng thêm logic mâu thuẫn này.

---

## 21. Strict rules AI Agent phải ưu tiên follow

Khi có nhiều cách code, AI Agent ưu tiên theo thứ tự sau:

1. **Giữ đúng flow route → controller → service → entity**.
2. **Không nhét business logic dài vào controller**.
3. **Không gọi API trực tiếp rải rác nếu đã có thể tách `src/api/*`**.
4. **Không lặp check role giống hệt middleware trong service**.
5. **Ưu tiên enum cho status nghiệp vụ**.
6. **Ưu tiên type/interface thay vì `any`**.
7. **Nếu upload ảnh, dùng lại `ImageUpload` + `uploadImageToCloudinary`**.
8. **Nếu thao tác nhiều bảng, cân nhắc transaction**.
9. **Response backend nên ổn định theo `{ message, data }`**.
10. **Frontend phải có loading/submitting/error handling cơ bản**.

---

## 22. Kết luận sử dụng file này

File này không nhằm rewrite toàn bộ kiến trúc project, mà nhằm:

```txt
Chuẩn hóa theo style tốt nhất đang có trong project hiện tại,
đặc biệt lấy module Trainer Application (submit / approve / reject) làm chuẩn tham chiếu chính.
```

Khi AI Agent code chức năng mới:

- ưu tiên bám theo file này,
- nếu code cũ của project có chỗ khác style, ưu tiên chọn style trong file này,
- trừ khi bị ràng buộc bởi code legacy hoặc yêu cầu nghiệp vụ đặc biệt.


---

## 23. Project folder mapping / Domain placement

Mục này giúp AI Agent biết rõ **tạo file mới ở đâu** và **ưu tiên sửa file nào trước** khi thêm chức năng.

### 23.1 Frontend placement

#### a) Page theo chức năng

- Trang public: đặt trong

```txt
omnigym-solution-web/src/pages/pubblic/
```

Ví dụ:

```txt
Login.tsx
Register.tsx
TrainerJoin.tsx
```

- Trang customer: đặt trong

```txt
omnigym-solution-web/src/pages/customers/
```

- Trang admin/staff/manager: đặt trong

```txt
omnigym-solution-web/src/pages/admin/
```

Nếu module lớn, nên tạo folder riêng theo domain:

```txt
src/pages/admin/feature_name/
src/pages/admin/feature_name/components/
```

Ví dụ hiện có style này:

```txt
src/pages/admin/trainer_applications/
src/pages/admin/trainer_applications/components/
```

#### b) API layer

API riêng của từng domain đặt trong:

```txt
omnigym-solution-web/src/api/
```

Ví dụ:

```txt
trainerApplications.ts
users.ts
posts.ts
```

Rule:
- 1 domain nghiệp vụ nên có 1 file API riêng.
- Không tạo API function lẫn trong component nếu API đó có thể tái sử dụng.

#### c) Shared component

- Component dùng lại toàn site:

```txt
omnigym-solution-web/src/components/site/
```

Ví dụ:

```txt
ImageUpload.tsx
Navbar.tsx
Footer.tsx
```

- UI primitive/reusable nhỏ:

```txt
omnigym-solution-web/src/components/ui/
```

#### d) Utils

Helper dùng chung đặt trong:

```txt
omnigym-solution-web/src/utils/
```

Ví dụ:

```txt
cloudinary.ts
rsa.ts
```

#### e) Types

- Nếu type chỉ dùng trong 1 page nhỏ, có thể để ngay trong file page/component.
- Nếu type dùng lại nhiều nơi, tạo file riêng trong:

```txt
omnigym-solution-web/src/types/
```

Nếu `src/types/` chưa có, AI Agent có thể tạo khi cần.

---

### 23.2 Backend placement

#### a) Route

Đặt trong:

```txt
omingym_solution_api/src/routes/
```

Pattern file name:

```txt
feature.routes.ts
```

Ví dụ:

```txt
trainer-application.routes.ts
faq.routes.ts
post.routes.ts
```

#### b) Controller

Đặt trong:

```txt
omingym_solution_api/src/controllers/
```

Pattern:

```txt
feature.controller.ts
```

#### c) Service

Đặt trong:

```txt
omingym_solution_api/src/services/
```

Pattern:

```txt
feature.service.ts
```

#### d) DTO

Đặt trong:

```txt
omingym_solution_api/src/dtos/
```

Pattern:

```txt
feature.dto.ts
```

#### e) Entity / Model

Đặt trong:

```txt
omingym_solution_api/src/models/
```

Pattern:

```txt
feature.entity.ts
```

Nếu là bảng con/quan hệ phụ thì đặt tên rõ:

```txt
trainer-application-certificate.entity.ts
trainer-certificate.entity.ts
```

#### f) Enum / constant nghiệp vụ

- Nếu enum nhỏ, liên quan chặt tới model, có thể để file riêng trong `src/models/` như hiện tại.
- Nếu về sau enum/constant lớn hơn, có thể tách `src/constants/` hoặc `src/enums/`, nhưng chỉ làm khi thực sự cần.

#### g) Mount route

Sau khi tạo route mới, phải mount trong:

```txt
omingym_solution_api/src/app.ts
```

---

### 23.3 Rule chọn chỗ đặt file khi chưa chắc chắn

Nếu AI Agent phân vân nên đặt file ở đâu, ưu tiên theo thứ tự:

1. Đặt cạnh domain gần nhất đang tồn tại.
2. Nếu là API/domain logic, ưu tiên tách file riêng hơn là nhét chung.
3. Nếu là shared utility/component thật sự dùng lại được, mới đưa vào `shared/site/ui/utils`.
4. Không tạo file/folder mới quá sớm nếu chức năng rất nhỏ và chỉ dùng 1 chỗ.

---

## 24. Do / Don't rules

Mục này là rule ngắn gọn để AI Agent đọc nhanh trước khi code.

### 24.1 DO

- **Do** tách `API layer` trong `src/api/*`.
- **Do** giữ flow `route → controller → service → entity`.
- **Do** để business logic chính trong service.
- **Do** dùng enum cho status nghiệp vụ.
- **Do** dùng transaction khi thao tác nhiều bảng.
- **Do** dùng `ImageUpload` + `uploadImageToCloudinary` cho upload ảnh.
- **Do** lấy error message từ backend nếu có.
- **Do** thêm loading/submitting state ở frontend.
- **Do** đặt tên file theo pattern đang có trong project.
- **Do** ưu tiên type/interface thay vì `any`.

### 24.2 DON'T

- **Don't** nhét toàn bộ logic vào 1 page/component rất dài nếu có thể tách helper/API/component con.
- **Don't** gọi `axios` trực tiếp rải rác trong nhiều component cho cùng 1 domain.
- **Don't** để controller làm business logic nặng.
- **Don't** check lại role y hệt middleware trong service nếu không có business rule riêng.
- **Don't** hard-code status string khắp backend nếu đã có enum.
- **Don't** tạo Trainer chính thức ngay ở bước register account nếu flow nghiệp vụ yêu cầu approve hồ sơ.
- **Don't** upload file trực tiếp về backend nếu chức năng đang follow chuẩn Cloudinary URL flow.
- **Don't** thêm thư viện validate/state management mới chỉ để giải quyết một case nhỏ nếu project chưa thống nhất dùng thư viện đó.
- **Don't** đổi style naming của 1 module riêng lẻ khác hẳn phần còn lại của project.

---

## 25. Copy-ready mini templates

Mục này cung cấp các template cực ngắn để AI Agent có thể copy và sửa nhanh.

### 25.1 Frontend API template

```ts
import api from "./axios";

export const featureAPI = {
  create: (payload: CreateFeaturePayload) => api.post("/features", payload),
  update: (id: number, payload: UpdateFeaturePayload) =>
    api.put(`/features/${id}`, payload),
  getAll: (params?: Record<string, string | number>) =>
    api.get("/features", { params }),
  getOne: (id: number) => api.get(`/features/${id}`),
  remove: (id: number) => api.delete(`/features/${id}`),
};
```

### 25.2 Backend route template

```ts
import { Router } from "express";
import {
  createFeatureHandler,
  getFeaturesHandler,
  getFeatureByIdHandler,
  updateFeatureHandler,
  deleteFeatureHandler,
} from "../controllers/feature.controller.js";
import { isAuthenticated, authorizeRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", isAuthenticated, authorizeRole(["Admin"]), createFeatureHandler);
router.get("/", isAuthenticated, getFeaturesHandler);
router.get("/:id", isAuthenticated, getFeatureByIdHandler);
router.put("/:id", isAuthenticated, authorizeRole(["Admin"]), updateFeatureHandler);
router.delete("/:id", isAuthenticated, authorizeRole(["Admin"]), deleteFeatureHandler);

export default router;
```

### 25.3 Backend controller template

```ts
export const createFeatureHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập." });
    }

    const validationError = validateCreateFeatureBody(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await createFeature(userId, req.body);

    return res.status(201).json({
      message: "Tạo dữ liệu thành công.",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
```

### 25.4 Backend service template

```ts
export const createFeature = async (userId: number, dto: CreateFeatureDto) => {
  const repo = AppDataSource.getRepository(Feature);

  const item = repo.create({
    user_id: userId,
    name: dto.name,
  });

  return await repo.save(item);
};
```

### 25.5 Approve / Reject action template

```ts
router.patch(
  "/:id/approve",
  isAuthenticated,
  authorizeRole(["Admin", "Staff"]),
  approveFeatureHandler,
);

router.patch(
  "/:id/reject",
  isAuthenticated,
  authorizeRole(["Admin", "Staff"]),
  rejectFeatureHandler,
);
```

Service rule:

```ts
if (item.status !== FeatureStatus.Pending) {
  throw new Error("Chỉ có thể xử lý dữ liệu đang chờ duyệt.");
}
```

### 25.6 Upload image field template

```tsx
<ImageUpload
  value={form.image_url}
  onChange={(value) => setField("image_url", value)}
/>
```

---

## 26. Final note for AI Agent

Khi bắt đầu code một chức năng mới trong project này, AI Agent nên tự hỏi theo đúng thứ tự sau:

```txt
1. Chức năng này thuộc domain nào?
2. Frontend page/component nên đặt ở folder nào?
3. Có cần file API riêng trong src/api không?
4. Backend có cần route/controller/service riêng không?
5. Có status nghiệp vụ không → cần enum không?
6. Có cần role middleware không?
7. Có cần transaction vì đụng nhiều bảng không?
8. Có cần upload ảnh theo flow Cloudinary không?
9. Response backend đã theo { message, data } chưa?
10. Code này đã gần với style Trainer Application submit/approve/reject chưa?
```

Nếu chưa chắc cách code, ưu tiên đọc lại module tham chiếu Trainer Application trước rồi mới triển khai.
