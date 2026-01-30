# CarePoint Frontend

A modern React TypeScript application for healthcare management.

## Features

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Context API** for state management
- **JWT Authentication**

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file (optional):
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Layout.tsx      # Main layout wrapper
├── pages/              # Page components
│   ├── Home.tsx        # Landing page
│   ├── Login.tsx       # Authentication
│   ├── Register.tsx    # User registration
│   └── Dashboard.tsx   # User dashboard
├── context/            # React Context providers
│   └── AuthContext.tsx # Authentication state
├── services/           # API services
│   └── api.ts         # Axios configuration
├── types/              # TypeScript type definitions
│   └── index.ts       # Common types
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── App.tsx            # Main app component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## API Integration

The frontend is configured to work with the Flask backend running on `http://localhost:5000`. The API proxy is configured in `vite.config.ts`.

## Authentication

The app uses JWT tokens for authentication:
- Tokens are stored in localStorage
- Automatic token attachment to API requests
- Protected routes redirect to login
- Context-based authentication state

## Styling

Uses Tailwind CSS with custom theme configuration:
- Primary colors: Blue shades
- Responsive design
- Component-based styling

## Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:5000/api
```