# Test API - Membership Packages

## 1. Seed dữ liệu
```bash
npx tsx seed-membership-packages.ts
```

---

## 2. Test Endpoints

### GET - Lấy danh sách tất cả gói (Công khai)
```bash
curl -X GET http://localhost:3000/api/membership-packages
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Basic - 1 Tháng",
    "price": "299000",
    "duration_months": 1,
    "description": "Gói hạn chế cho người mới bắt đầu",
    "benefits": "Truy cập gym buổi tối (18:00-22:00)\nSử dụng thiết bị cơ bản\nConsultation miễn phí 1 lần",
    "status": "active",
    "created_at": "2025-05-31T10:00:00.000Z",
    "updated_at": "2025-05-31T10:00:00.000Z"
  }
  ...
]
```

---

### GET - Lấy chi tiết gói (ID = 1)
```bash
curl -X GET http://localhost:3000/api/membership-packages/1
```

---

### POST - Tạo gói mới (Chỉ Admin/Partner)
**Yêu cầu:** Phải đăng nhập trước
```bash
curl -X POST http://localhost:3000/api/membership-packages \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trial - 7 Ngày",
    "price": 99000,
    "duration_months": 0,
    "description": "Gói dùng thử miễn phí",
    "benefits": "Truy cập gym 7 ngày\nSử dụng thiết bị cơ bản",
    "status": "active"
  }'
```

---

### PUT - Cập nhật gói (ID = 1)
**Yêu cầu:** Phải đăng nhập trước
```bash
curl -X PUT http://localhost:3000/api/membership-packages/1 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 349000,
    "description": "Cập nhật: Giá mới 349.000đ"
  }'
```

---

## 3. Dữ liệu Test

### 6 Gói Membership đã seed:

| STT | Tên | Giá | Thời hạn | Status |
|-----|-----|-----|----------|--------|
| 1 | Basic - 1 Tháng | 299.000đ | 1 tháng | active |
| 2 | Standard - 3 Tháng | 749.000đ | 3 tháng | active |
| 3 | Premium - 6 Tháng | 1.299.000đ | 6 tháng | active |
| 4 | VIP - 1 Năm | 2.499.000đ | 12 tháng | active |
| 5 | Student - 3 Tháng | 499.000đ | 3 tháng | active |
| 6 | Corporate - 1 Năm | 9.999.000đ | 12 tháng | active |

---

## 4. Test trong Postman

Tạo Collection với các request:

```json
{
  "info": {
    "name": "OmniGym - Membership Packages",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get All Packages",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/membership-packages"
      }
    },
    {
      "name": "Get Package by ID",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/membership-packages/1"
      }
    },
    {
      "name": "Create Package",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/membership-packages",
        "body": {
          "mode": "raw",
          "raw": "{\"name\":\"Test Package\",\"price\":500000,\"duration_months\":3}"
        }
      }
    },
    {
      "name": "Update Package",
      "request": {
        "method": "PUT",
        "url": "{{base_url}}/api/membership-packages/1",
        "body": {
          "mode": "raw",
          "raw": "{\"price\":349000}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    }
  ]
}
```

---

## 5. Quy trình test

1. **Start server:**
   ```bash
   npm run dev
   ```

2. **Seed dữ liệu:**
   ```bash
   npx tsx seed-membership-packages.ts
   ```

3. **Test GET công khai** → Không cần login
4. **Test POST/PUT** → Cần login với role Admin hoặc Partner

---

**Ghi chú:** 
- Các request POST/PUT yêu cầu session (cookie) từ đăng nhập
- Chỉ Admin/Partner mới có quyền tạo/sửa gói
- Customer/Trainer/Staff chỉ có quyền xem danh sách gói
