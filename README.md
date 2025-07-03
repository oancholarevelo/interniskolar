# 🎓 InternIskolar

A comprehensive web application for managing On-the-Job Training (OJT) opportunities at Polytechnic University of the Philippines (PUP) Institute of Technology Department. This portal serves as a centralized platform for students to discover internship opportunities and for administrators to manage Host Training Establishments (HTEs).

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## 🌟 Features

### For Students
- **🔍 Advanced Search & Filtering**: Multi-criteria search by company name, address, nature of business, and course specialization
- **📊 Application Status Tracker**: Track your application progress with 5 detailed status levels:
  - 🤍 Interested - Companies you want to apply to
  - 📤 Applied - Applications you've submitted
  - 💬 Interviewing - Companies currently interviewing you
  - ✅ Offer Received - Companies that have made offers
  - ❌ Rejected - Applications that were unsuccessful
- **📱 My Applications**: Organized dashboard grouping all tracked applications by status with:
  - Collapsible sections for better organization
  - Expand/collapse all functionality
  - Application count tracking
  - Status-specific company lists
- **📧 Smart Email Generation**: Auto-generate personalized Gmail drafts with:
  - Professional templates
  - Automatic resume link inclusion
  - Company-specific contact details
  - Student profile integration
- **📄 Comprehensive Profile Management**:
  - Personal information editing
  - PDF resume upload with progress tracking
  - Resume file management and viewing
  - Profile data persistence
- **📋 Extensive Template Library**: Download 14 essential OJT documents:
  - MOA templates and agreements
  - Medical and consent forms
  - Evaluation instruments
  - DTR and accomplishment reports
  - Portfolio submission guidelines
- **🔐 Secure School Authentication**: Restricted access with PUP email verification
- **🎯 Course-Specific Filtering**: Filter companies by supported academic programs (DIT, DCPET, DEET, DOMT)
- **⏰ Real-time MOA Status**: Visual indicators for active vs. expired partnerships

### For Administrators
- **🏢 Complete HTE Management**: Full CRUD operations for Host Training Establishments with:
  - Modal-based form interface
  - Required field validation
  - Comprehensive company data tracking
- **📊 Intelligent MOA Management**:
  - Expiration date tracking with visual indicators
  - Toggle between active and expired partnerships
  - MOA document link management
  - Automatic status calculations
- **🔄 Advanced Data Processing**: 
  - Bulk upload capabilities from Excel files
  - Hyperlink extraction from MOA columns
  - Duplicate entry handling
  - Data normalization and validation
- **📈 Comprehensive Analytics Dashboard**:
  - **MOA Expiry Alerts**: Color-coded urgency system (30/60/90 days) with quick update access
  - **Student Metrics**: Total registered user count
  - **Popularity Analytics**: Most applied-to companies with application counts
  - **Partnership Statistics**: Active vs. expired HTE breakdown
  - **Application Insights**: Status distribution across all students
  - **Trend Analysis**: Application pattern tracking
- **✅ Advanced Quality Control**:
  - Duplicate detection and management
  - Data integrity validation
  - Course name normalization
  - Contact information verification
- **👥 User Management**: Role-based access control with admin privileges
- **📋 Bulk Operations**: Mass data import and export capabilities

## 🚀 Live Demo

Visit the live application: [PUP OJT Portal](https://interniskolar.vercel.app)

## 🛠️ Technology Stack

### Frontend Technologies
- **React.js 18+**: Modern functional components with hooks (useState, useEffect)
- **CSS3**: Custom styling with CSS Grid, Flexbox, and advanced animations
- **Responsive Design**: Mobile-first approach with media queries
- **Lucide React**: Comprehensive icon library with 40+ icons used
- **Modern JavaScript**: ES6+ features, async/await, destructuring

### Backend & Database
- **Firebase Suite**:
  - **Firestore**: NoSQL database with real-time listeners
  - **Authentication**: Email/password with domain restrictions
  - **Storage**: File upload for PDF resumes with progress tracking
  - **Security Rules**: Role-based access control
- **Real-time Synchronization**: Live data updates across all connected clients

### Development & Deployment
- **Vercel**: Serverless deployment with automatic CI/CD
- **Git**: Version control with branching strategy
- **VS Code**: Development environment with extensions
- **Chrome DevTools**: Debugging and performance optimization

### Data Processing
- **Python 3.x**: Server-side scripts for data processing
- **openpyxl**: Excel file manipulation and hyperlink extraction
- **firebase-admin**: Server-side Firebase operations
- **pytz**: Timezone handling for international compatibility

### Performance & Analytics
- **Vercel Analytics**: Real-time performance monitoring
- **Code Splitting**: Optimized bundle loading
- **Image Optimization**: Automatic image compression and format conversion
- **Caching**: Browser and CDN caching strategies

### Development Tools
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Webpack**: Module bundling (via Create React App)
- **Babel**: JavaScript transpilation
- **Service Workers**: Offline capability and caching

## 📱 User Interface

### Student Dashboard
- Clean, card-based layout for browsing HTEs
- Real-time search and filtering
- Visual indicators for MOA status (active/expired)
- Mobile-responsive design

### Admin Panel
- Comprehensive HTE management interface
- Modal-based forms for data entry
- Toggle between active and expired partnerships
- Bulk data upload capabilities

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase project
- Python 3.x (for data processing scripts)

### Clone Repository
```bash
git clone https://github.com/oancholarevelo/pup-internship.git
cd ojt-portal
```

### Install Dependencies
```bash
npm install
```

### Firebase Configuration
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication, Firestore, and Storage
3. Add your domain to authorized domains
4. Update `firebaseConfig` in `src/App.js` with your credentials

### Environment Setup
Create a `.env` file in the root directory:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

### Run Development Server
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## 📊 Data Management

### Excel Data Import
The portal includes sophisticated Python scripts for processing Excel files:

```bash
# Install Python dependencies
pip install openpyxl firebase-admin pytz

# Run the upload script
python upload_script.py
```

**Advanced Processing Features:**
- **Smart Hyperlink Extraction**: Extracts real hyperlinks from Excel MOA columns
- **Intelligent Duplicate Handling**: Identifies and manages duplicate company entries
- **Flexible Date Processing**: Handles both expiry years and validity duration formats
- **Course Name Normalization**: Standardizes course abbreviations (DCET→DCPET, DOM-LOMT→DOMT)
- **Data Validation**: Ensures data integrity before Firestore upload
- **Timezone Handling**: Proper datetime conversion with timezone support

### Comprehensive Data Structures

#### HTE (Host Training Establishment) Document
```javascript
{
  name: "Company Name",
  address: "Complete Company Address", 
  contactPerson: "Primary Contact Name",
  contactNumber: "+63XXXXXXXXX",
  email: "contact@company.com",
  natureOfBusiness: "Industry/Business Type",
  course: "DIT/DCPET/DEET/DOMT", // Supported courses (comma-separated)
  moaEndDate: Timestamp, // MOA expiration date
  moaLink: "https://drive.google.com/..." // Link to MOA document
}
```

#### Student Profile Document
```javascript
{
  name: "Student Full Name",
  resumeUrl: "https://storage.firebase.com/...", // PDF resume URL
  resumeFileName: "Resume.pdf",
  shortlist: [
    {
      hteId: "hte_document_id",
      status: "Applied" // Interested|Applied|Interviewing|Offer Received|Rejected
    }
  ]
}
```

#### Analytics Data Structure
```javascript
{
  totalStudents: 150,
  activeHTEs: 75,
  expiredHTEs: 25,
  expiringHTEs: [
    {
      ...hteData,
      urgency: "high", // high|medium|low
      daysUntilExpiry: 15
    }
  ],
  mostPopularHTEs: [
    {
      hte: {...hteData},
      applications: 25
    }
  ],
  applicationStats: {
    "Interested": 45,
    "Applied": 30,
    "Interviewing": 12,
    "Offer Received": 8,
    "Rejected": 5
  }
}
```

## 🔐 Authentication & Security

- **Email Verification**: Required for all new accounts
- **Domain Restriction**: Only @pup.edu.ph and @iskolarngbayan.pup.edu.ph emails allowed
- **Role-Based Access**: Admin privileges for @pup.edu.ph accounts
- **Secure Firebase Rules**: Firestore security rules protect data integrity

## 🎨 UI/UX Features

- **🎨 Modern PUP-Themed Design**: Custom color scheme with university branding (PUP maroon and gold)
- **📱 Fully Responsive Layout**: Seamless experience across desktop, tablet, and mobile devices
- **🎯 Intuitive Navigation**: 
  - Collapsible hamburger menu for mobile
  - Role-based navigation (different menus for students vs. admins)
  - Breadcrumb-style page management
- **⚡ Interactive Components**:
  - Dropdown application status selector with icons
  - Toggle switches for admin filters
  - Expandable/collapsible sections
  - Hover effects and smooth transitions
- **🔄 Real-time Data Updates**: Live synchronization with Firebase for instant updates
- **📊 Visual Status Indicators**:
  - Color-coded MOA expiry status (green/yellow/red)
  - Application status icons and badges
  - Admin role indicators
  - Loading states and progress bars
- **🎭 Accessibility Features**:
  - Proper ARIA labels and roles
  - Keyboard navigation support
  - Screen reader compatible
  - High contrast color ratios
- **💫 Enhanced User Experience**:
  - Smooth modal dialogs with backdrop
  - Card-based information layout
  - Search highlighting and filtering
  - Auto-generated email templates
  - File upload progress tracking
- **🔧 Advanced Form Handling**:
  - Real-time validation
  - Error state management
  - Auto-save functionality
  - Form persistence across sessions

## 📱 Mobile Experience

The portal is fully responsive with:
- Touch-friendly navigation
- Optimized modal layouts for small screens
- Mobile-first design approach
- Fast loading on mobile networks

## 🚀 Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### Build for Production
```bash
npm run build
```

## 🔄 Future Enhancements

- [ ] **Email Notifications**: Automated reminders for MOA renewals and application updates
- [ ] **Advanced Visualizations**: Charts and graphs for analytics dashboard
- [ ] **Export Features**: Download analytics reports and application data
- [ ] **Company Profiles**: Detailed company information and student reviews
- [ ] **API Integration**: Connect with external job portals and systems
- [ ] **Mobile App**: React Native mobile application
- [ ] **Real-time Notifications**: Push notifications for application status changes
- [ ] **Calendar Integration**: Schedule interviews and important dates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**Oliver Anchola Revelo**
- GitHub: [@oancholarevelo](https://github.com/oancholarevelo)
- Email: oliverarevelo@iskolarngbayan.pup.edu.ph

## 🏫 Institution

**Polytechnic University of the Philippines**
- College of Computer and Information Sciences
- Bachelor of Science in Information Technology

## 📞 Support

For support or questions about the PUP OJT Portal:
- Create an issue in this repository
- Contact the development team
- Visit the PUP CCIS department

---

*Built with ❤️ for PUP students by PUP students*

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
