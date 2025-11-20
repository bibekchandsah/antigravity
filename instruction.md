# 🔐 Secure Webpage with Microsoft Authentication Key

## 📖 Description
This project is a secure webpage(responsive) system that uses a **hardcoded Microsoft authentication key** to allow access to only one authorized user. The authentication mechanism ensures that no one can access the main page or other internal pages without entering the correct key.


---

## ⚙️ Features

### note : make each feature as a module for easy maintain

### 1. Microsoft Authentication with Hardcoded Key
- A fixed Microsoft authentication key is hardcoded into the backend.
- The authorized user (with the key stored securely on their phone) can log in using this key.
- Show the QR code and the secret key on the console
- store the secret key in the .env file
- in admin page(only admin can access), admin can generate new secret key and QR code and store it in the .env file (confirmation required)
- admin can view the activity log
- Unauthorized users will be denied access.


### 1.1 google Oauth
- Dual Authentication - Support for both Google OAuth and TOTP
- Email Authorization - Only bibeksha48@gmail.com (configurable) gets access
- Professional Design - Modern "Continue with Google" button with official Google styling
- Error Handling - Clear messages for unauthorized attempts
- tokens in .env file

### 1.2 login page
- 6 Separate Input Boxes: Each digit has its own input field
- Auto-Advance: Automatically moves to next box when you type a digit
- Smart Backspace: Moves to previous box when backspacing on empty field
- Paste Support: Paste a 6-digit code and it fills all boxes automatically
- Auto-Submit: Automatically submits when all 6 digits are entered
- Visual Feedback: Boxes turn green when filled, red on error
- Keyboard Navigation: Arrow keys move between boxes
- Empty: Light gray background
- Filled: Green background with checkmark feel
- Error: Red background with shake animation
- Success: Green border on successful login

### 2. Login Verification
- The user must input the correct Microsoft authentication key on the login page. (5 attempts)
- Initial Lockout: 15 minutes
- Progressive Penalty: Doubles with each violation (max 24 hours)
-  IP-Based Rate Limiting: Tracks failed attempts per IP address
- Real-time Countdown: Shows remaining lockout time to users
- Upon successful authentication, the system redirects the user to the **Main Page**.
- Attempt Counter: Shows remaining attempts before lockout
- Lockout Message: Clear explanation when locked out
- Auto-refresh: Page refreshes when lockout expires

### 2.1 Main Page
- The main page is protected and requires authentication.
- Unauthorized users will be denied access.
- The main page displays a welcome message and a logout button.
- The logout button redirects the user back to the **Login Page**.

### 2.2 Logout
- The logout button redirects the user back to the **Login Page**.

### 2.2.1 admin control
## make it dashboard, graphical view
- The admin control is displayed on the **Main Page**.
- The admin control shows the following information:
- The activity log is updated in real-time.
- The activity log is stored in a database.
- The activity log is accessible to the **Admin**.
- Rate Limit Dashboard: View all monitored IPs and their status
- Clear All Limits: Emergency function to clear all rate limits
- Activity Monitoring: See recent failed attempts and violations
- Real-time Status: Current lockout information
- .env file (session timeout, lockout time, max attempts, location tracker API, etc.)
- show location of the user (using IP address through IPinfo API)
- device information (using User-Agent)
- browser, OS, device type

### 2.3 Session Validation
- Each protected page (including the main page) performs an authentication check.
- If an unauthenticated user attempts to access a protected route directly, they are automatically redirected back to the **Login Page**.
- sesstion timeout after 15 minutes of inactivity (auto logout, customize it according to .env file)
- create custom 404 and Access Denied pages to provide a better user experience.

### 2.4 Session Management
- The session is stored in the browser using cookies.
- The session is validated on each protected page load.
- The session is destroyed when the user logs out or when the session times out.

### 4. Single User Access Security
- Designed for **one-user-only** access.
- Prevents multiple or unauthorized logins by validating against a single hardcoded key.

### 5. notify (telegram & email)
- Successful Login Notifications: Instant alerts for every successful authentication
- Failed Login Notifications (optional): Real-time alerts for failed attempts
- Test Notifications: Admin can test the notification system
- 📱 Telegram: Instant messages via Telegram bot
- 📧 Email(sendgrid): Professional HTML emails with complete details
- 🔄 Both(optional): Send to both channels simultaneously
- add tokens in .env file
---

## 🛠️ Technology Stack
- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js / Express.js *(or any preferred backend)*  
- **Authentication:** Hardcoded Microsoft key validation

---

## 🔒 Workflow Overview
1. The user visits the **Login Page**.  
2. The user enters the Microsoft authentication key.  
3. If the entered key matches the hardcoded one, a session/token is generated.  
4. The user is redirected to the **Main Page**.  
5. All internal pages validate the session/token before rendering.  
6. If the session/token is missing or invalid, the system redirects the user back to the **Login Page**.

---

## 🚀 Future Enhancements
- Replace hardcoded key with dynamic Microsoft OAuth 2.0 authentication.
- Add encrypted session handling and token expiration.
- Enable support for multiple user roles.

---

## 📁 Folder Structure (Example)
project/
│
├── public/
│ ├── css/
│ ├── js/
│ └── index.html
│
├── views/
│ ├── login.html
│ └── main.html
│
├── server.js
└── README.md



---

## 👤 Author
**Bibek Sha**

A secure, minimal authentication system built for personal use — ensuring that only one trusted user can access private webpages using a Microsoft authentication key.
