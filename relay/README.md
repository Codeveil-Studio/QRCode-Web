# Relay - Item Management & Tracking System

A comprehensive item management and tracking system built with Next.js, TypeScript, and Supabase.

## Features

### 🏷️ Item Management

- **Complete CRUD operations** for items with detailed tracking
- **QR Code generation** for each item
- **Location tracking** with GPS integration
- **Status management** (Active, Maintenance Needed, Inactive, Out of Service)
- **Tags and metadata** for flexible categorization
- **Maintenance tracking** with last maintenance dates

### 📋 Item Type Management

- **Custom item types** - Create organization-specific item types
- **Standard item types** - 70+ pre-defined system item types across 10 categories
- **Bulk adoption** - Select and adopt multiple standard types at once
- **Category organization** - Electronics, Furniture, Tools, Safety, Medical, etc.
- **Visual distinction** - Custom types (purple) vs Standard types (blue)

### 🏢 Organization Management

- **Multi-organization support** with proper membership roles
- **Organization isolation** - Each org sees only their own data
- **Role-based access** (Admin/Member) foundation ready

### 🔐 Authentication & Security

- **Supabase Authentication** with email/password
- **Row Level Security (RLS)** for data protection
- **Organization-based data access**
- **Secure file uploads** for issue attachments

### 📊 Dashboard & Analytics

- **Real-time statistics** - Active items, open issues, critical alerts
- **Interactive sidebar** with live data
- **Comprehensive reporting** system
- **Issue tracking** with detailed reporting

### 🔔 Notifications

- **Customizable notification preferences**
- **Real-time updates** for critical events
- **Email notifications** for important alerts

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Styling**: Tailwind CSS with custom components
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Supabase account

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/gursimran1906/relay.git
cd relay
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**
   Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run database migrations**
   Execute the SQL files in the `database/` directory in your Supabase dashboard:

- `seed-item-types.sql` - Standard item types
- Other migration files as needed

5. **Start the development server**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Database Schema

### Core Tables

- **`items`** - Individual tracked items with metadata
- **`item_types`** - Custom and standard item type definitions
- **`org_members`** - Organization membership with roles
- **`issues`** - Issue tracking and reporting
- **Plus supporting tables for profiles, notifications, etc.**

### Key Relationships

- Items belong to organizations via `org_members`
- Item types can be system-wide (`org_id = null`) or organization-specific
- Users can adopt standard types, creating organization copies

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── ...               # Other pages
├── components/            # React components
├── database/             # SQL migrations and seeds
├── utils/                # Utility functions
└── styles/               # Global styles
```

## API Endpoints

### Item Types

- `GET /api/item-types` - Fetch user's item types
- `POST /api/item-types` - Create custom item type
- `POST /api/item-types/adopt` - Adopt standard item type
- `GET /api/item-types/system` - Fetch available standard types

### Items & Issues

- Full CRUD operations for items and issue management
- File upload endpoints for issue attachments
- Reporting and analytics endpoints

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Learn More

This project is built with [Next.js](https://nextjs.org). To learn more about Next.js:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
