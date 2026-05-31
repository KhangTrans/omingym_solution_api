# OmniGym - Feature Documentation

---

## Feature: Đăng ký tài khoản Trainer

### Mục đích

Cho phép người dùng đăng ký tài khoản với vai trò **Trainer**.

Trainer sau khi đăng ký sẽ **chưa được hoạt động ngay**. Hệ thống tạo sẵn hồ sơ Trainer ở trạng thái chưa active, sau đó Trainer cần bổ sung hồ sơ chuyên môn và chờ Admin/Staff duyệt.

---

### Luồng

Register chọn Trainer → Tạo user inactive → Tạo trainer application draft → Tạo trainer inactive → Redirect sang `/trainer-join`

---

### Database

#### `users`

Lưu tài khoản đăng nhập.

Khi đăng ký Trainer:

- `role_id = 5`
- `status = inactive`

#### `trainer_applications`

Tạo sẵn đơn đăng ký Trainer.

Khi register Trainer:

- `user_id = users.id`
- `status = draft`

#### `trainers`

Tạo sẵn hồ sơ Trainer nhưng chưa active.

Khi register Trainer:

- `user_id = users.id`
- `application_id = trainer_applications.id`
- `is_active = false`
- `approved_at = null`
- `approved_by = null`

---

### API

#### POST `/auth/register`

Đăng ký tài khoản mới. Nếu `role_id = 5`, hệ thống đăng ký tài khoản Trainer.

Request

- `identifier` (string, required) - email hoặc số điện thoại
- `otp` (string, required) - mã OTP xác thực
- `password` (string, required) - mật khẩu đã mã hóa RSA từ frontend
- `role_id` (number, required) - `5` là Trainer
- `personalInfo.full_name` (string, required) - họ tên người dùng

Example request

```json
{
  "identifier": "trainer@gmail.com",
  "otp": "123456",
  "password": "encrypted_password",
  "role_id": 5,
  "personalInfo": {
    "full_name": "Nguyễn Văn A"
  }
}
```

Response

- `201` - Đăng ký thành công

```json
{
  "message": "User registered successfully",
  "userId": 35
}
```

- `400` - OTP sai, thiếu field hoặc dữ liệu không hợp lệ
- `409/400` - Email hoặc số điện thoại đã tồn tại

---

### Backend logic

Khi `role_id = 5`:

1. Verify OTP.
2. Hash password bằng bcrypt.
3. Tạo user với `role_id = 5` và `status = inactive`.
4. Tạo `trainer_applications` với `status = draft`.
5. Tạo `trainers` với `application_id` và `is_active = false`.
6. Chạy toàn bộ trong transaction.

---

### Lưu ý

- Không được tạo `trainers` thiếu `application_id` vì DB yêu cầu:

```sql
application_id integer NOT NULL UNIQUE
```

- Trainer đăng ký xong chưa hoạt động ngay.
- Trainer phải bổ sung hồ sơ tại `/trainer-join`.
- Khi Admin/Staff approve, hệ thống mới set:

```txt
users.status = active
trainers.is_active = true
trainer_applications.status = approved
```
