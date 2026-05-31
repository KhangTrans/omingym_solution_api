# OmniGym - Feature Documentation

---

## Feature: Gửi đơn đăng ký làm Trainer

### Mục đích

Cho phép tài khoản Trainer bổ sung hồ sơ chuyên môn, giấy tờ định danh và chứng chỉ để gửi đơn chờ Admin/Staff duyệt.

---

### Luồng

Trainer đăng nhập → Vào `/trainer-join` → Lấy application hiện tại → Điền hồ sơ → Submit → Application chuyển `pending` → Hiển thị khung chờ duyệt

---

### Trạng thái đơn

Bảng: `trainer_applications`

Field: `status`

| Status | Ý nghĩa | Có được submit không? |
|---|---|---|
| `draft` | Đơn mới tạo, chưa gửi | Có |
| `pending` | Đã gửi, đang chờ duyệt | Không |
| `approved` | Đã được duyệt | Không |
| `rejected` | Bị từ chối | Có, được gửi lại |

---

### Database

#### `trainer_applications`

Lưu thông tin hồ sơ apply Trainer.

Fields chính:

- `user_id`
- `bio`
- `specialization`
- `avatar_url`
- `phone_number`
- `address`
- `years_experience`
- `hourly_rate`
- `identity_number`
- `identity_image_url`
- `status`
- `submitted_at`
- `reviewed_at`
- `reviewed_by`
- `rejection_reason`

#### `trainer_application_certificates`

Lưu chứng chỉ Trainer gửi kèm đơn apply.

Fields chính:

- `application_id`
- `cert_name`
- `issued_by`
- `certificate_number`
- `image_url`
- `issued_at`
- `expires_at`
- `status`
- `verified_at`
- `verified_by`
- `rejection_reason`

#### `trainers`

Lưu hồ sơ Trainer chính.

Khi submit application:

- Không tạo Trainer mới nếu đã có.
- Nếu user chưa có Trainer record, tạo `trainers` với:
  - `application_id = trainer_applications.id`
  - `is_active = false`

---

### API

#### POST `/trainer-applications`

Gửi hoặc gửi lại hồ sơ đăng ký làm Trainer.

Request

- `bio` (string, optional)
- `specialization` (string, required)
- `avatar_url` (string, required)
- `phone_number` (string, required)
- `address` (string, required)
- `years_experience` (number, optional)
- `hourly_rate` (number, optional)
- `identity_number` (string, required)
- `identity_image_url` (string, required)
- `certificates` (array, required)

Mỗi item trong `certificates`:

- `cert_name` (string, required)
- `issued_by` (string, required)
- `certificate_number` (string, required)
- `image_url` (string, required)
- `issued_at` (string/date, optional)
- `expires_at` (string/date, required)

Example request

```json
{
  "bio": "Tôi có 3 năm kinh nghiệm huấn luyện cá nhân.",
  "specialization": "Strength training, Weight loss",
  "avatar_url": "https://example.com/avatar.jpg",
  "phone_number": "0909123456",
  "address": "Quận 1, TP.HCM",
  "years_experience": 3,
  "hourly_rate": 300000,
  "identity_number": "079123456789",
  "identity_image_url": "https://example.com/identity.jpg",
  "certificates": [
    {
      "cert_name": "NASM-CPT",
      "issued_by": "NASM",
      "certificate_number": "CERT-001",
      "image_url": "https://example.com/cert.jpg",
      "issued_at": "2022-01-01",
      "expires_at": "2027-01-01"
    }
  ]
}
```

Response

- `201` - Gửi đơn thành công

```json
{
  "message": "Nộp đơn đăng ký Trainer thành công.",
  "data": {
    "id": 12,
    "user_id": 35,
    "status": "pending",
    "submitted_at": "2026-05-31T14:15:03.000Z",
    "certificates": [
      {
        "id": 20,
        "application_id": 12,
        "cert_name": "NASM-CPT",
        "status": "pending"
      }
    ]
  }
}
```

Error responses

- `400` - Thiếu thông tin hồ sơ

```json
{ "message": "Vui lòng nhập đầy đủ thông tin hồ sơ Trainer." }
```

- `400` - Thiếu thông tin định danh

```json
{ "message": "Vui lòng nhập đầy đủ thông tin định danh." }
```

- `400` - Chưa có chứng chỉ

```json
{ "message": "Vui lòng thêm ít nhất một chứng chỉ." }
```

- `400` - Đơn đang chờ duyệt

```json
{ "message": "Đơn đăng ký Trainer của bạn đang chờ duyệt." }
```

- `400` - Tài khoản Trainer đã được duyệt

```json
{ "message": "Tài khoản Trainer của bạn đã được duyệt." }
```

---

### Backend logic

Khi user submit:

1. Lấy `userId` từ session.
2. Validate request body.
3. Tìm application mới nhất của user.
4. Nếu `status = pending`, chặn submit lại.
5. Nếu `status = approved`, chặn submit lại.
6. Nếu chưa có application, tạo mới.
7. Nếu `status = draft` hoặc `rejected`, update application cũ.
8. Set `status = pending`.
9. Set `submitted_at = now`.
10. Clear `rejection_reason`, `reviewed_at`, `reviewed_by`.
11. Xóa certificates cũ của application.
12. Insert certificates mới.
13. Đảm bảo `trainers` record tồn tại với `is_active = false`.
14. Return application kèm certificates.

---

### Chống double submit

Backend chống double submit bằng rule:

```txt
Nếu application.status = pending thì không cho submit lại.
```

Nếu user bấm submit 2 lần:

```txt
Request đầu tiên chuyển status sang pending
Request thứ hai bị chặn
```

Không tạo thêm row mới trong:

- `trainer_applications`
- `trainer_application_certificates`

---

### API lấy trạng thái đơn hiện tại

#### GET `/trainer-applications/me`

Lấy application mới nhất của user đang đăng nhập.

Request

- Không cần body.
- User phải đăng nhập bằng session.

Response

- `200` - Có application

```json
{
  "data": {
    "id": 12,
    "user_id": 35,
    "status": "pending",
    "submitted_at": "2026-05-31T14:15:03.000Z",
    "rejection_reason": null,
    "certificates": [
      {
        "id": 20,
        "cert_name": "NASM-CPT",
        "status": "pending"
      }
    ]
  }
}
```

- `200` - Chưa có application

```json
{ "data": null }
```

---

### Frontend behavior

Frontend `/trainer-join` render theo status:

| API result | UI |
|---|---|
| `null` | Hiển thị form apply |
| `draft` | Hiển thị form apply |
| `pending` | Hiển thị khung chờ duyệt |
| `rejected` | Hiển thị lý do từ chối + form gửi lại |
| `approved` | Hiển thị trạng thái đã duyệt / chuyển dashboard |

Sau khi submit thành công:

```txt
Không redirect homepage
Không render form nữa
Hiển thị khung chờ duyệt
```

---

### Tổng kết flow

```txt
Register Trainer
        ↓
users.status = inactive
trainer_applications.status = draft
trainers.is_active = false
        ↓
Trainer submit hồ sơ
        ↓
trainer_applications.status = pending
Hiển thị khung chờ duyệt
        ↓
Admin reject
        ↓
trainer_applications.status = rejected
Trainer được gửi lại
        ↓
Hoặc Admin approve
        ↓
trainer_applications.status = approved
trainers.is_active = true
users.status = active
trainer_certificates được tạo
```
