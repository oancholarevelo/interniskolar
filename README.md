# 🎓 PUP OJT Portal

A comprehensive web application for managing On-the-Job Training (OJT) opportunities at Polytechnic University of the Philippines (PUP). This portal serves as a centralized platform for students to discover internship opportunities and for administrators to manage Host Training Establishments (HTEs).

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## 🌟 Features

### For Students
- **🔍 Search & Filter**: Find internship opportunities by company name, location, or course
- **⭐ Shortlist**: Save interesting companies for easy access later
- **📧 Quick Apply**: Generate personalized Gmail drafts with resume links
- **📄 Profile Management**: Upload resume and manage personal information
- **📋 Templates**: Download essential OJT documents and forms
- **🔐 Secure Authentication**: Login with PUP email addresses only

### For Administrators
- **🏢 HTE Management**: Add, edit, and delete Host Training Establishments
- **📊 MOA Tracking**: Monitor MOA expiration dates and validity
- **🔄 Data Processing**: Bulk upload HTE data from Excel with hyperlink extraction
- **📈 Analytics**: View expired vs active partnerships
- **✅ Quality Control**: Manage duplicate entries and data validation

## 🚀 Live Demo

Visit the live application: [PUP OJT Portal](https://ojt-portal-gx0fznodu-oliver-s-projects-f885d951.vercel.app)

## 🛠️ Technology Stack

- **Frontend**: React.js with modern hooks and components
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Styling**: Custom CSS with responsive design
- **Deployment**: Vercel with automatic CI/CD
- **Data Processing**: Python scripts with openpyxl for Excel handling
- **Icons**: Lucide React for consistent iconography

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
The portal includes Python scripts for processing Excel files:

```bash
# Install Python dependencies
pip install openpyxl firebase-admin pytz

# Run the upload script
python upload_script.py
```

**Features:**
- Extracts real hyperlinks from Excel MOA columns
- Handles duplicate company entries intelligently
- Processes both expiry years and validity durations
- Normalizes data for Firestore compatibility

### Data Structure
```javascript
// HTE Document Structure
{
  name: "Company Name",
  address: "Company Address", 
  contactPerson: "Contact Name",
  contactNumber: "+63XXXXXXXXX",
  email: "contact@company.com",
  course: "DIT, DCPET, DEET", // Supported courses
  moaEndDate: Timestamp, // MOA expiration
  moaLink: "https://..." // Link to MOA document
}
```

## 🔐 Authentication & Security

- **Email Verification**: Required for all new accounts
- **Domain Restriction**: Only @pup.edu.ph and @iskolarngbayan.pup.edu.ph emails allowed
- **Role-Based Access**: Admin privileges for @pup.edu.ph accounts
- **Secure Firebase Rules**: Firestore security rules protect data integrity

## 🎨 UI/UX Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern Interface**: Clean, intuitive design following modern web standards
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Loading States**: Smooth loading indicators and error handling
- **Modal System**: Elegant modal dialogs for forms and confirmations

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

- [ ] **Email Notifications**: Automated reminders for MOA renewals
- [ ] **Advanced Analytics**: Dashboard with charts and statistics
- [ ] **Student Applications**: Track application status and responses
- [ ] **Company Profiles**: Detailed company information and reviews
- [ ] **API Integration**: Connect with external job portals
- [ ] **Mobile App**: React Native mobile application

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
