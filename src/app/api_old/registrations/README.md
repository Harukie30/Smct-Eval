# 📚 Registration API - Backend Developer Guide

Hey Backend Developer! 👋

This guide will help you understand the Registration API system and what you need to do to add database functionality.

---

## 🎯 Current Setup

**Status:** ✅ Basic structure is ready, frontend is calling the endpoints!

The API routes are created with a **simple placeholder** that returns success. The frontend handles the actual logic using localStorage. Your job is to **add database logic** when you're ready!

---

## 📍 API Endpoints Overview

### 1. Get All Registrations
- **Endpoint:** `GET /api/registrations`
- **Purpose:** Get all pending registrations (for admin dashboard)
- **File:** `route.ts`
- **Status:** ⚠️ Basic - Returns empty array (needs database)

### 2. Create Registration
- **Endpoint:** `POST /api/registrations`
- **Purpose:** Create a new registration when user signs up
- **File:** `route.ts`
- **Status:** ⚠️ Basic - Stores in memory (needs database)

### 3. Approve Registration
- **Endpoint:** `POST /api/registrations/[id]/approve`
- **Purpose:** Approve a registration and create active account
- **File:** `[id]/approve/route.ts`
- **Status:** ⚠️ Placeholder - Frontend handles logic (needs database)

### 4. Reject Registration
- **Endpoint:** `DELETE /api/registrations/[id]/reject`
- **Purpose:** Reject a registration
- **File:** `[id]/reject/route.ts`
- **Status:** ⚠️ Placeholder - Frontend handles logic (needs database)

---

## 🔨 What You Need to Do (Step by Step)

### Phase 1: Learn & Setup (Take your time!)

1. **Choose a Database**
   - **Option A: Prisma + PostgreSQL** (Recommended for beginners)
     - Website: https://www.prisma.io/
     - Tutorial: https://www.prisma.io/docs/getting-started
   
   - **Option B: MongoDB + Mongoose**
     - Website: https://www.mongodb.com/
     - Tutorial: https://mongoosejs.com/docs/guide.html

2. **Set up your database**
   - Install database software
   - Create database connection
   - Test connection works

### Phase 2: Create Database Schema

You need two tables:

**Table 1: `pending_registrations`**
```sql
- id (integer, primary key)
- name (string)
- email (string, unique)
- username (string, unique)
- password (string, hashed)
- position (string)
- department (string)
- branch (string)
- role (string)
- contact (string)
- signature (text)
- hire_date (date)
- status (string: 'pending', 'approved', 'rejected')
- submitted_at (datetime)
```

**Table 2: `accounts`**
```sql
- id (integer, primary key)
- employee_id (integer)
- name (string)
- email (string, unique)
- username (string, unique)
- password (string, hashed)
- position (string)
- department (string)
- branch (string)
- role (string)
- contact (string)
- signature (text)
- hire_date (date)
- is_active (boolean)
- approved_date (datetime)
- created_at (datetime)
- updated_at (datetime)
```

### Phase 3: Update Each Endpoint

Start with the easiest and work your way up:

1. **Start with GET** (Easiest)
   - File: `route.ts` → `GET` function
   - Action: Query database for all pending registrations
   - Example: `const registrations = await db.pendingRegistrations.findMany();`

2. **Then POST** (Medium)
   - File: `route.ts` → `POST` function
   - Action: Insert new registration into database
   - Example: `await db.pendingRegistrations.create({ data: {...} });`

3. **Then Approve** (Harder)
   - File: `[id]/approve/route.ts`
   - Action: Move registration from pending to accounts
   - Example: 
     ```javascript
     // 1. Find pending registration
     const registration = await db.pendingRegistrations.findOne({ id });
     // 2. Create account
     await db.accounts.create({ data: registration });
     // 3. Delete from pending
     await db.pendingRegistrations.delete({ id });
     ```

4. **Finally Reject** (Easy)
   - File: `[id]/reject/route.ts`
   - Action: Delete registration from pending
   - Example: `await db.pendingRegistrations.delete({ id });`

---

## 🧪 How to Test Your Work

### Option 1: Use Thunder Client (VS Code Extension)
1. Install Thunder Client extension
2. Send GET request to `http://localhost:3000/api/registrations`
3. Check if you get data back

### Option 2: Use Postman
1. Download Postman
2. Create new request
3. Test your endpoints

### Option 3: Use the Frontend
1. The frontend is already calling your endpoints!
2. Check browser console for errors
3. Use Network tab to see API calls

---

## 💡 Tips for Success

### Tip 1: Start Small
Don't try to do everything at once! Start with just GET endpoint, make it work, then move to the next.

### Tip 2: Use Console.log()
Add lots of `console.log()` to see what's happening:
```javascript
console.log('Received ID:', registrationId);
console.log('Found registration:', registration);
```

### Tip 3: Copy Examples
Look at how departments API works (it calls external backend). Copy that pattern!

### Tip 4: Don't Worry About Breaking Things
The frontend has fallback to localStorage, so if your code breaks, the app still works!

### Tip 5: Ask for Help
Stuck? That's normal! Ask your frontend developer (they set this up to help you!), or search online.

---

## 📖 Learning Resources

### For Beginners:
- **Next.js API Routes:** https://nextjs.org/learn/basics/api-routes
- **Prisma Quickstart:** https://www.prisma.io/docs/getting-started/quickstart
- **MongoDB Tutorial:** https://www.mongodb.com/docs/drivers/node/current/quick-start/

### Video Tutorials:
- "Next.js API Routes Explained" - YouTube
- "Prisma in 100 Seconds" - Fireship
- "MongoDB Crash Course" - Traversy Media

---

## 🤝 Working with Frontend

The frontend developer (your teammate!) set this up to make your life easier:

✅ **Frontend calls YOUR endpoints**
✅ **If your code fails, app still works** (localStorage fallback)
✅ **Clear TODO comments in each file**
✅ **Example code to copy**

You can work at your own pace without pressure! When you add database code:
- Frontend automatically uses it
- No need to change frontend code
- Just add your logic to the TODOs

---

## ✅ Checklist

- [ ] Choose database (Prisma or MongoDB)
- [ ] Install database
- [ ] Create connection
- [ ] Create schema/models
- [ ] Update GET endpoint
- [ ] Update POST endpoint
- [ ] Update Approve endpoint
- [ ] Update Reject endpoint
- [ ] Test with Thunder Client/Postman
- [ ] Test with frontend

---

## 🆘 Need Help?

**Stuck on something?** Here's what to do:

1. Check the TODO comments in each file
2. Look at the example pseudocode
3. Google the error message
4. Ask your frontend teammate
5. Check Stack Overflow

**Remember:** Everyone struggles with this at first. It's normal! Take your time and don't stress. 💪

---

## 🎉 Good Luck!

You got this! The structure is ready, just add your database logic step by step.

Your frontend teammate has your back - they've set this up so you can't break anything! 🛡️

**Happy coding!** 🚀

