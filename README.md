# 🎓 InternIskolar - OJT Portal

A web portal for university students to find internship opportunities and track their applications. Administrators can manage partner companies and their MOA agreements.

## What is InternIskolar?

InternIskolar is a centralized platform where university students can browse available internship opportunities at partner companies (Host Training Establishments or HTEs) and track their application progress. The system also helps administrators manage company partnerships and MOA (Memorandum of Agreement) renewals.

## How It Works

### For Students

1. **Sign Up & Login**
   - Students: Register using your university email (@iskolarngbayan.pup.edu.ph) or Gmail (@gmail.com)
   - Administrators: Must use institutional email (@pup.edu.ph)
   - Verify your email to access the portal

2. **Browse Companies**
   - View all available internship opportunities
   - Search by company name, location, or business type
   - Filter by your course/program
   - See which companies have active MOAs

3. **Track Applications**
   - Click "Track" on companies you're interested in
   - Update your application status as you progress:
     - **Interested** - Companies you want to apply to
     - **Applied** - You've submitted your application
     - **Interviewing** - Currently in interview process
     - **Offer Received** - Company made you an offer
     - **Rejected** - Application was unsuccessful

4. **Email Companies**
   - Click "Email Company" to open a pre-written Gmail draft
   - Professional template includes your information and resume link
   - Just add any personal touches and send

5. **Manage Your Profile**
   - Update your name and personal information
   - Upload your resume (PDF format)
   - Your resume link is automatically included in email templates

6. **Download Templates**
   - Access all required OJT documents and forms
   - Download MOA templates, consent forms, DTR, evaluation forms, etc.

7. **Resume Builder**
   - Create professional resumes with an intuitive form-based interface
   - Live preview shows your resume as you type
   - Choose from multiple font styles (Modern, Classic, Typewriter)
   - Export your resume as a high-quality PDF
   - All sections are customizable: Personal Info, Objective, Education, Experience, Skills, Honors, Languages, References
   - Clean, professional templates with proper formatting

8. **Contact & Feedback**
   - Request new templates or report bugs
   - Suggest improvements to the website
   - Submit general feedback

### For Administrators

1. **Manage Companies**
   - Add new partner companies
   - Edit existing company information
   - Delete outdated partnerships
   - Track MOA expiration dates

2. **Analytics Dashboard**
   - View total registered students
   - Monitor active vs expired MOAs
   - See which companies are most popular
   - Track application statistics across all students

3. **MOA Management**
   - Get alerts for expiring MOAs (30, 60, 90 day warnings)
   - Update MOA renewal dates
   - Manage MOA document links

4. **Handle Student Requests**
   - Review feedback and template requests from students
   - Update request status (pending, in-progress, completed)
   - Delete resolved requests

## Main Features

### Dashboard
- Browse all available companies with enhanced search and filtering
- Visual indicators for MOA status (active/expired) with color coding
- Course-specific filtering for relevant opportunities
- Real-time application tracking buttons
- Advanced search by company name, location, and industry type
- Connection status indicator for offline/online state

### My Applications (Students Only)
- Comprehensive view of all companies you're tracking
- Organized by application status with collapsible sections
- Visual progress tracking through application stages
- Quick status updates and removal options
- Email integration for direct company contact

### Analytics (Admins Only)
- Comprehensive platform metrics and insights
- MOA expiration tracking with urgency levels (30, 60, 90 day alerts)
- Popular companies analytics and trends
- Application status distribution across all students
- Student engagement statistics

### Templates & Documents
- Download essential OJT documents and forms
- MOA templates, consent forms, evaluation instruments
- DTR templates and portfolio guidelines
- Admin upload functionality for new templates

### Profile (Students Only)
- Update personal information with validation
- Upload and manage resume (PDF format, 10MB limit)
- Secure resume link generation for sharing
- Upload progress tracking and file management

### Resume Builder
- Create professional resumes with guided form interface
- Live preview updates as you type with empty state messaging
- Multiple font family options (Modern Sans-Serif, Classic Serif, Typewriter Monospace)
- Comprehensive sections: Personal Information, Objective, Education, Experience, Skills, Honors & Awards, Languages, References
- Export to PDF with professional formatting and pagination
- Clean, empty template for users to fill with their own information
- Responsive design that works on all devices

### Contact & Feedback
- Students: Submit feedback, template requests, and bug reports
- Admins: Manage incoming requests with status tracking
- Feedback categorization and priority management

## Technology

- **Frontend**: React.js with modern CSS and responsive design
- **Backend**: Firebase (Authentication, Firestore database, Storage)
- **PDF Generation**: jsPDF library for resume export
- **Deployment**: Vercel with automatic CI/CD
- **Email Integration**: Gmail compose links with pre-filled templates
- **File Support**: PDF uploads for resumes and templates (10MB limit)
- **Real-time Features**: Live preview, connection status monitoring
- **Security**: Email verification, role-based access control

## Links

- **Live Website**: [InternIskolar Portal](https://interniskolar.vercel.app)
- **GitHub Repository**: [https://github.com/oancholarevelo/interniskolar](https://github.com/oancholarevelo/interniskolar)
## Getting Started

1. **Visit the Portal**
   - Go to [InternIskolar Portal](https://interniskolar.vercel.app)
   - The platform works on all devices (desktop, tablet, mobile)

2. **Create Your Account**
   - Students: Use your university email (@iskolarngbayan.pup.edu.ph) or Gmail (@gmail.com)
   - Administrators: Must use institutional email (@pup.edu.ph)
   - Create a strong password (minimum 6 characters)

3. **Verify Your Email**
   - Check your inbox for a verification email
   - Click the verification link to activate your account
   - You can resend the verification email if needed

4. **Complete Your Profile**
   - Add your full name and personal information
   - Upload your resume (PDF format, max 10MB)
   - Your resume will be accessible via a secure shareable link

5. **Start Using the Platform**
   - Browse available companies and internship opportunities
   - Use the Resume Builder to create professional resumes
   - Track your applications and update their status
   - Download necessary OJT templates and forms

6. **Stay Connected**
   - The platform shows your connection status
   - Data syncs automatically when you're back online
   - Email companies directly through integrated Gmail links

## New Features & Updates

### ✨ Resume Builder
- **Professional Resume Creation**: Build resumes with a guided, form-based interface
- **Live Preview**: See your resume update in real-time as you type
- **Multiple Font Options**: Choose from Modern (Sans-Serif), Classic (Serif), or Typewriter (Monospace)
- **Comprehensive Sections**: Personal Information, Objective, Education, Experience, Skills, Honors & Awards, Languages, References
- **PDF Export**: Download high-quality PDF resumes with professional formatting
- **Clean Start**: Empty template allows users to input their own information
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### 🔄 Enhanced User Experience
- **Connection Status Indicator**: Real-time online/offline status with sync notifications
- **Improved Error Handling**: Better error messages and recovery options
- **Email Verification Flow**: Streamlined verification process with resend options
- **Form Validation**: Enhanced input validation across all forms
- **Mobile Optimization**: Improved mobile experience for all features

### 📊 Admin Improvements
- **Analytics Dashboard**: Comprehensive metrics and insights
- **MOA Management**: Advanced tracking with expiration alerts
- **Template Management**: Upload and organize OJT documents
- **Student Feedback System**: Manage requests and feedback efficiently

## Support & Contact

If you need help or want to report issues:
- **In-App Support**: Use the Contact page in the portal to submit feedback
- **Developer Contact**: [LinkedIn](https://www.linkedin.com/in/oliver-revelo/) or oancholarevelo@gmail.com
- **GitHub Issues**: Report bugs or request features on the repository
- **Email**: Direct support for urgent issues

## Future Enhancements

- **Resume Templates**: Additional resume styles and layouts
- **Company Profiles**: Enhanced company information and reviews
- **Application Tracking**: Advanced analytics for students
- **Mobile App**: Native mobile application development
- **Integration**: API connections with job boards and company systems

---

*Developed by Oliver A. Revelo for PUP - ITECH students*
