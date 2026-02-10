# KINAMBA Garage Cooperation - Admin Portal

A professional garage management system with secure authentication, vehicle tracking, and approval workflow system.

## Features

- 🔐 **Secure Authentication** - Login, signup, password reset with email verification
- 📊 **Vehicle Management** - Track vehicles, entry/exit logs, and status
- ✅ **Approval Workflows** - Manage approval requests with notifications
- 👥 **User Management** - Role-based access (Admin/Manager/Operator)
- 📋 **Audit Logging** - Complete compliance and event tracking
- 📱 **Responsive Design** - Works on all devices

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or bun package manager

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd garage-guard-pro

# Step 3: Install dependencies
npm install

# Step 4: Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Setup

Create a `.env.local` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

## Technologies Used

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn-ui + Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **State Management**: React Context API

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React Context providers
├── pages/          # Page components
├── lib/            # Utilities and helpers
├── hooks/          # Custom React hooks
└── integrations/   # Third-party integrations
```

## Documentation

- [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md) - Complete authentication guide
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Quick start guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Developer API reference

## Deployment

To deploy the application:

1. Build for production: `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Set environment variables on your hosting platform
4. Ensure HTTPS is enabled

## License

© KINAMBA Garage Cooperation. All rights reserved.

## Support

For issues or questions, refer to the documentation files or contact support.
