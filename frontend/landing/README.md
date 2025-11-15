# WhisperAPI Landing Page

Conversion-focused marketing website for WhisperAPI - the fast, affordable audio transcription service.

## 📋 Overview

This is a Next.js 14 application serving as the public-facing landing page for WhisperAPI. It showcases features, pricing, and documentation to convert visitors into users.

## 🎯 Features

- **Hero Section**: Attention-grabbing value proposition with code examples
- **Features Showcase**: Six key benefits highlighting speed, cost, and flexibility
- **Pricing Table**: Three tiers (Free, Pro, Pay-as-you-go) with clear comparison
- **Competitor Comparison**: Side-by-side comparison with Rev, Otter, and Descript
- **FAQ Section**: 12 common questions with expandable accordion UI
- **Documentation Preview**: Quick start guide with code examples in multiple languages
- **Mobile Responsive**: Fully optimized for all device sizes
- **Fast Loading**: Optimized for Core Web Vitals (<2s load time)
- **SEO Optimized**: Complete metadata and OpenGraph tags

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

The site will be available at `http://localhost:3002`

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
frontend/landing/
├── app/
│   ├── layout.tsx          # Root layout with nav and footer
│   ├── page.tsx             # Homepage (integrates all components)
│   ├── globals.css          # Global styles and Tailwind
│   ├── pricing/
│   │   └── page.tsx         # Dedicated pricing page
│   └── docs/
│       └── page.tsx         # Documentation preview page
│
├── components/
│   ├── Hero.tsx             # Hero section with value prop
│   ├── Features.tsx         # Features showcase grid
│   ├── PricingTable.tsx     # Pricing comparison table
│   ├── ComparisonTable.tsx  # Competitor comparison
│   └── FAQ.tsx              # FAQ accordion
│
├── __tests__/               # Jest + React Testing Library tests
│   ├── Hero.test.tsx
│   ├── Features.test.tsx
│   ├── PricingTable.test.tsx
│   ├── ComparisonTable.test.tsx
│   └── FAQ.test.tsx
│
├── public/                  # Static assets
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

All components have >80% test coverage including:
- Component rendering
- User interactions
- State changes
- Link navigation
- Accessibility

## 🎨 Styling

This project uses:
- **Tailwind CSS**: Utility-first CSS framework
- **Custom Design System**: Defined in `tailwind.config.js`
- **Responsive Design**: Mobile-first approach
- **Dark Mode Ready**: Theme variables prepared

### Custom Classes

```css
.btn-primary    /* Primary CTA buttons */
.btn-secondary  /* Secondary buttons */
.btn-ghost      /* Ghost/text buttons */
.card           /* Card container */
.code-block     /* Code snippet styling */
.text-gradient  /* Gradient text effect */
```

## 🔌 Integration Points

### With Dashboard (Task 10)

- Signup redirects: `/signup` → `https://app.whisperapi.com/signup`
- Login redirects: `/login` → `https://app.whisperapi.com/login`
- Configured via `NEXT_PUBLIC_DASHBOARD_URL`

### With Backend API (Task 8)

- API documentation references: `https://api.whisperapi.com/v1/*`
- Status page: Links to backend health monitoring
- Configured via `NEXT_PUBLIC_API_BASE_URL`

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

**Environment Variables** (set in Vercel dashboard):
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_DASHBOARD_URL`

### Other Platforms

The app is a standard Next.js application and can be deployed to:
- Netlify
- AWS Amplify
- Cloudflare Pages
- Self-hosted (Docker)

## 📊 Performance Targets

- **Lighthouse Score**: >90 across all metrics
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3.0s
- **Cumulative Layout Shift**: <0.1
- **Bundle Size**: <200KB (gzipped)

## 🔒 Security

- All external links use `rel="noopener noreferrer"`
- Security headers configured in `next.config.js`
- HTTPS enforced via Strict-Transport-Security
- XSS protection enabled
- No inline scripts

## 📝 Content Management

### Updating Pricing

Edit pricing plans in `/components/PricingTable.tsx`:

```typescript
const plans = [
  {
    name: 'Free',
    price: '$0',
    // ... other properties
  }
];
```

### Updating FAQ

Edit FAQ items in `/components/FAQ.tsx`:

```typescript
const faqs = [
  {
    question: 'Your question here?',
    answer: 'Your answer here.',
  }
];
```

### Updating Competitors

Edit comparison data in `/components/ComparisonTable.tsx`:

```typescript
const comparisons = [
  {
    feature: 'Feature name',
    rev: '$1.50',
    otter: '$0.33',
    descript: '$0.40',
    whisperapi: '$0.15',
  }
];
```

## 🚦 Available Scripts

```bash
npm run dev          # Start development server on :3002
npm run build        # Create production build
npm start            # Start production server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run lint         # Run ESLint
```

## 🐛 Troubleshooting

### Build Errors

**Issue**: `Module not found: Can't resolve '@/components/...'`
- **Solution**: Ensure `tsconfig.json` paths are configured correctly

**Issue**: Tailwind styles not applying
- **Solution**: Check `tailwind.config.js` content paths include all relevant files

### Runtime Errors

**Issue**: `NEXT_PUBLIC_* environment variables not defined`
- **Solution**: Copy `.env.example` to `.env.local` and set values

**Issue**: Navigation redirects not working
- **Solution**: Verify `NEXT_PUBLIC_DASHBOARD_URL` is set correctly

## 📚 Related Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Testing Library](https://testing-library.com/react)

## 🤝 Integration with Other Modules

### Task 8 (API Routes)
Landing page documentation references API endpoints. Ensure base URL matches deployed backend.

### Task 10 (Dashboard)
Signup/login CTAs redirect to dashboard. Update `NEXT_PUBLIC_DASHBOARD_URL` when dashboard is deployed.

### Task 13 (Deployment)
Vercel configuration in root deployment files. This landing page deploys independently.

## 📄 License

Part of the WhisperAPI project. All rights reserved.

## 👥 Support

- Documentation: `/docs`
- Email: support@whisperapi.com
- GitHub Issues: [Report a bug](https://github.com/whisperapi/whisperapi/issues)
