🛠 Công nghệ sử dụng
1. Frontend:
●HTML5, CSS3, JavaScript (ES6+)

●Bootstrap 5, FontAwesome

●Modular JavaScript (import/export)

2. Backend:
●Node.js, Express.js

●MSSQL (SQL Server)

●Cohere AI API, LanguageTool API

●bcrypt (mã hóa mật khẩu)

●Helmet, CORS, Compression, Rate Limiting

3. Công cụ bắt buộc
●Node.js (phiên bản 16 hoặc cao hơn)

●SQL Server (hoặc SQL Server Express)

🎯 Tính năng chính của dự án
1. Kiểm tra ngữ pháp đa ngôn ngữ
   
●Hỗ trợ nhiều ngôn ngữ: English, Japanese, French, German, Russian, Spanish, Portuguese, Galician,...

●Tự động phát hiện ngôn ngữ từ văn bản nhập vào.

●Kết hợp nhiều công cụ kiểm tra: LanguageTool và Cohere AI để tăng độ chính xác.


2. Giao diện người dùng trực quan

●Giao diện chia làm 2 phần: văn bản gốc và văn bản đã chỉnh sửa.

●Highlight lỗi ngữ pháp và gợi ý sửa lỗi trực quan.

●Thống kê: số từ, số ký tự, số lỗi.

3. Hệ thống tài khoản người dùng
   
●Đăng ký, đăng nhập, đăng xuất.

●Phân quyền: user thường và admin.

●Quản lý thông tin cá nhân: username, email, phone, fullName.

4. Admin Dashboard
   
●Quản lý người dùng: xem, thêm, sửa, xóa.

●Thống kê: số người dùng, số lượt kiểm tra, ngôn ngữ sử dụng,...

●Gửi thông báo đến người dùng khi có thay đổi thông tin.

5. Hệ thống thông báo (Notifications)
    
●Thông báo real-time khi admin cập nhật thông tin user.

●Lịch sử thông báo, đánh dấu đã đọc, xóa thông báo cũ.

●Hiển thị số thông báo chưa đọc.

6. Cơ chế fallback và cache
    
●Sử dụng Cohere AI như fallback nếu LanguageTool không trả về kết quả.

●Cache kết quả kiểm tra để tăng tốc độ phản hồi.

7. Bảo mật
    
●Xác thực người dùng qua JWT (token).

●Phân quyền truy cập route (chỉ admin mới vào được admin panel).

●Rate limiting để chống spam.

●CSP (Content Security Policy) được cấu hình cho admin route.

15. Real-time Grammar Checking
●Kiểm tra ngữ pháp trong thời gian thực.
●Gợi ý sửa lỗi và cho phép áp dụng từng lỗi hoặc tất cả.



