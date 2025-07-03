import React, { useState, useEffect } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  updateDoc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import {
  PlusCircle,
  Edit,
  Trash2,
  FileText,
  LogOut,
  Building,
  Users,
  Clock,
  Search,
  X,
  Mail,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Star,
  Menu,
  GraduationCap,
  ExternalLink,
  Heart,
  Send,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  TrendingUp,
  Calendar,
  AlertCircle,
  Eye,
  Activity,
  Phone,
  MessageSquare,
} from "lucide-react";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAIc6oFOBknpItFeHuw9qMhrNOzNjns5kk",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "pup-internship.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "pup-internship",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "pup-internship.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "742208522282",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:742208522282:web:7b4e0e4f8c8e3f3ed75b53",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-JZDCXXLHJ8",
};

// --- Helper function for extracting name from email ---
const extractNameFromEmail = (email) => {
  if (!email) return "";
  
  // Extract the part before @ symbol
  const localPart = email.split('@')[0];
  
  // Handle different email formats
  if (localPart.includes('.')) {
    // For emails like "firstname.lastname@domain.com"
    return localPart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  } else {
    // For emails like "firstnamelastname@domain.com" - just capitalize first letter
    return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
  }
};

// --- Helper function for cleaning and normalizing course names ---
const normalizeCourse = (courseName) => {
  if (!courseName) return "";
  const upperCaseName = courseName.trim().toUpperCase();
  if (["DCET", "DCPET"].includes(upperCaseName)) return "DCPET";
  if (["DEET"].includes(upperCaseName)) return "DEET";
  if (["DOM-LOMT", "DOMT", "DOMT-LOMT", "DOMTLOMT"].includes(upperCaseName))
    return "DOMT";
  return upperCaseName;
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [htes, setHtes] = useState([]);
  const [allHtes, setAllHtes] = useState([]);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [storage, setStorage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHte, setEditingHte] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    natureOfBusiness: "",
    moaEndDate: "",
    course: "",
    moaLink: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showExpired, setShowExpired] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [moaStatus, setMoaStatus] = useState("All");
  const [adminAnalytics, setAdminAnalytics] = useState({
    totalStudents: 0,
    expiringHTEs: [],
    mostPopularHTEs: [],
    activeHTEs: 0,
    expiredHTEs: 0,
    applicationStats: {},
  });
  const [feedbackRequests, setFeedbackRequests] = useState([]);
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'template',
    subject: '',
    message: ''
  });
  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    try {
      // Validate Firebase config before initialization
      if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
        console.error('Firebase configuration is incomplete:', {
          hasApiKey: !!firebaseConfig.apiKey,
          hasAuthDomain: !!firebaseConfig.authDomain,
          hasProjectId: !!firebaseConfig.projectId
        });
        setLoading(false);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);
      const firebaseStorage = getStorage(app);
      
      // Validate that Firebase services were initialized properly
      if (!firestoreDb || !firebaseAuth || !firebaseStorage) {
        console.error('Failed to initialize Firebase services');
        setLoading(false);
        return;
      }

      setDb(firestoreDb);
      setAuth(firebaseAuth);
      setStorage(firebaseStorage);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
        setUser(currentUser);
        setCheckingVerification(false);
        
        if (currentUser) {
          const adminEmailsForTesting = [
            "oliverarevelo@iskolarngbayan.pup.edu.ph",
          ];
          const isTestAdmin = adminEmailsForTesting.includes(currentUser.email);
          const isDomainAdmin = currentUser.email.endsWith("@pup.edu.ph");
          setIsAdmin(isDomainAdmin || isTestAdmin);
          
          // Only proceed with profile creation if email is verified
          if (currentUser.emailVerified && firestoreDb) {
            try {
              const profileDocRef = doc(firestoreDb, "profiles", currentUser.uid);
              const profileSnapshot = await getDoc(profileDocRef);
              
              if (!profileSnapshot.exists()) {
                const extractedName = extractNameFromEmail(currentUser.email);
                await setDoc(profileDocRef, {
                  name: extractedName,
                  resumeUrl: "",
                  shortlist: []
                });
              }
            } catch (error) {
              console.error("Error creating profile:", error);
            }
          }
        } else {
          setIsAdmin(false);
          setProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Set a user-friendly error message for display
      setLoading(false);
      
      // Provide specific error messages based on the error type
      let userMessage = "Failed to connect to the application. Please refresh the page and try again.";
      
      if (error.code === "auth/invalid-api-key") {
        userMessage = "Authentication configuration error. Please contact support or try refreshing the page.";
      } else if (error.message.includes("network")) {
        userMessage = "Network connection error. Please check your internet connection and try again.";
      } else if (error.code === "duplicate-app") {
        // This is usually not a critical error, just continue silently
        return;
      }
      
      // Don't show alert on duplicate-app error
      if (error.code !== "duplicate-app") {
        alert(userMessage);
      }
    }
  }, []);

  // Fetch user profile data (including shortlist)
  useEffect(() => {
    if (user && db) {
      const profileDocRef = doc(db, "profiles", user.uid);
      const unsubscribe = onSnapshot(profileDocRef, (doc) => {
        setProfile(
          doc.exists() ? doc.data() : { name: "", resumeUrl: "", shortlist: [] }
        );
      });
      return () => unsubscribe();
    }
  }, [user, db]);

  useEffect(() => {
    if (!db || !user || !user.emailVerified) return;
    const hteCollection = collection(db, "htes");
    const unsubscribe = onSnapshot(
      hteCollection,
      (snapshot) => {
        const fullList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        fullList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setAllHtes(fullList);
        if (isAdmin) {
          setHtes(fullList);
        } else {
          const activeList = fullList.filter((hte) =>
            hte.moaEndDate ? hte.moaEndDate.toDate() >= new Date() : false
          );
          setHtes(activeList);
        }
      },
      (error) => console.error("Error fetching HTEs:", error)
    );
    return () => unsubscribe();
  }, [db, user, isAdmin]);

  // Fetch analytics data for admins
  useEffect(() => {
    if (!isAdmin || !db) return;

    const fetchAnalytics = async () => {
      try {
        // Get all profiles to count students and analyze application data
        const profilesSnapshot = await getDocs(collection(db, "profiles"));
        const profiles = profilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Count total students
        const totalStudents = profiles.length;
        
        // Analyze application popularity
        const htePopularity = {};
        const applicationStats = {
          Interested: 0,
          Applied: 0,
          Interviewing: 0,
          'Offer Received': 0,
          Rejected: 0,
        };
        
        profiles.forEach(profile => {
          const applications = profile.shortlist || [];
          
          if (applications.length > 0) {
            applications.forEach(app => {
              // Handle both legacy and new format
              if (typeof app === 'string') {
                htePopularity[app] = (htePopularity[app] || 0) + 1;
                applicationStats.Interested++;
              } else if (app.hteId) {
                htePopularity[app.hteId] = (htePopularity[app.hteId] || 0) + 1;
                applicationStats[app.status] = (applicationStats[app.status] || 0) + 1;
              }
            });
          }
        });
        
        // Find most popular HTEs
        const mostPopularHTEs = Object.entries(htePopularity)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([hteId, count]) => ({
            hte: allHtes.find(h => h.id === hteId),
            applications: count
          }))
          .filter(item => item.hte);
        
        // Find HTEs expiring soon
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        
        const expiringHTEs = allHtes
          .filter(hte => hte.moaEndDate && hte.moaEndDate.toDate() > now)
          .map(hte => {
            const expiryDate = hte.moaEndDate.toDate();
            let urgency = 'low';
            if (expiryDate <= thirtyDays) urgency = 'high';
            else if (expiryDate <= sixtyDays) urgency = 'medium';
            else if (expiryDate <= ninetyDays) urgency = 'low';
            
            return {
              ...hte,
              urgency,
              daysUntilExpiry: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
            };
          })
          .filter(hte => hte.daysUntilExpiry <= 90)
          .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        
        // Count active vs expired HTEs
        const activeHTEs = allHtes.filter(hte => 
          !hte.moaEndDate || hte.moaEndDate.toDate() >= now
        ).length;
        const expiredHTEs = allHtes.length - activeHTEs;
        
        setAdminAnalytics({
          totalStudents,
          expiringHTEs,
          mostPopularHTEs,
          activeHTEs,
          expiredHTEs,
          applicationStats,
        });
        
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    fetchAnalytics();
  }, [isAdmin, db, allHtes]);

  // Fetch feedback requests for admins
  useEffect(() => {
    if (!isAdmin || !db) return;

    const feedbackCollection = collection(db, "feedback");
    const unsubscribe = onSnapshot(
      feedbackCollection,
      (snapshot) => {
        const requests = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => {
            // Sort by unread first, then by timestamp
            if (a.isRead !== b.isRead) {
              return a.isRead ? 1 : -1;
            }
            return b.timestamp?.toDate() - a.timestamp?.toDate();
          });
        setFeedbackRequests(requests);
      },
      (error) => console.error("Error fetching feedback:", error)
    );
    return () => unsubscribe();
  }, [isAdmin, db]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      setPage("dashboard");
    }
  };

  const openModal = (hte = null) => {
    if (hte) {
      setEditingHte(hte);
      setFormData({
        name: hte.name || "",
        address: hte.address || "",
        contactPerson: hte.contactPerson || "",
        contactNumber: hte.contactNumber || "",
        email: hte.email || "",
        natureOfBusiness: hte.natureOfBusiness || "",
        course: hte.course || "",
        moaEndDate: hte.moaEndDate?.toDate().toISOString().split("T")[0] || "",
        moaLink: hte.moaLink || "",
      });
    } else {
      setEditingHte(null);
      setFormData({
        name: "",
        address: "",
        contactPerson: "",
        contactNumber: "",
        email: "",
        natureOfBusiness: "",
        moaEndDate: "",
        course: "",
        moaLink: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);
  const handleFormChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!db) return;
    const moaEndDateTimestamp = formData.moaEndDate
      ? Timestamp.fromDate(new Date(formData.moaEndDate))
      : null;
    const hteData = { ...formData, moaEndDate: moaEndDateTimestamp };
    try {
      if (editingHte) await setDoc(doc(db, "htes", editingHte.id), hteData);
      else await addDoc(collection(db, "htes"), hteData);
      closeModal();
    } catch (error) {
      console.error("Error saving HTE:", error);
      alert("Failed to save HTE.");
    }
  };

  const handleDelete = async (id) => {
    if (!db || !window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "htes", id));
    } catch (error) {
      console.error("Error deleting HTE:", error);
      alert("Failed to delete HTE.");
    }
  };

  const handleApplicationStatusUpdate = async (hteId, newStatus = null) => {
    if (!user || !db) return;
    const profileDocRef = doc(db, "profiles", user.uid);
    
    // Convert legacy shortlist array to new format if needed
    const currentShortlist = profile?.shortlist || [];
    let applications = [];
    
    if (currentShortlist.length > 0 && typeof currentShortlist[0] === 'string') {
      // Legacy format - convert to new format
      applications = currentShortlist.map(id => ({ hteId: id, status: 'Interested' }));
    } else {
      // New format or empty
      applications = currentShortlist.filter(app => typeof app === 'object') || [];
    }
    
    const existingAppIndex = applications.findIndex(app => app.hteId === hteId);
    
    try {
      if (newStatus === null) {
        // Remove from applications (equivalent to old "unshortlist")
        if (existingAppIndex !== -1) {
          applications.splice(existingAppIndex, 1);
        }
      } else {
        // Add or update status
        if (existingAppIndex !== -1) {
          applications[existingAppIndex].status = newStatus;
        } else {
          applications.push({ hteId, status: newStatus });
        }
      }
      
      await updateDoc(profileDocRef, { shortlist: applications });
    } catch (error) {
      console.error("Error updating application status:", error);
      if (error.code === "not-found") {
        await setDoc(profileDocRef, { shortlist: applications }, { merge: true });
      }
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!user || !db) return;
    
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.name || extractNameFromEmail(user.email),
        type: feedbackForm.type,
        subject: feedbackForm.subject,
        message: feedbackForm.message,
        timestamp: Timestamp.fromDate(new Date()),
        isRead: false,
        status: 'pending'
      });
      
      setFeedbackForm({ type: 'template', subject: '', message: '' });
      setFeedbackMessage({ text: 'Your request has been submitted successfully!', type: 'success' });
      
      // Clear the message after 5 seconds
      setTimeout(() => {
        setFeedbackMessage({ text: '', type: '' });
      }, 5000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setFeedbackMessage({ text: 'Failed to submit request. Please try again.', type: 'error' });
      
      // Clear the error message after 5 seconds
      setTimeout(() => {
        setFeedbackMessage({ text: '', type: '' });
      }, 5000);
    }
  };

  const handleFeedbackMarkAsRead = async (feedbackId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "feedback", feedbackId), { isRead: true });
    } catch (error) {
      console.error("Error marking feedback as read:", error);
    }
  };

  const handleFeedbackStatusUpdate = async (feedbackId, newStatus) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "feedback", feedbackId), { status: newStatus });
    } catch (error) {
      console.error("Error updating feedback status:", error);
    }
  };

  const handleFeedbackDelete = async (feedbackId) => {
    if (!db || !window.confirm("Are you sure you want to delete this request?")) return;
    try {
      await deleteDoc(doc(db, "feedback", feedbackId));
    } catch (error) {
      console.error("Error deleting feedback:", error);
      alert("Failed to delete request.");
    }
  };

  const filteredHtes = htes.filter((hte) => {
    const name = hte.name || "";
    const address = hte.address || "";
    const natureOfBusiness = hte.natureOfBusiness || "";
    const hteCourses = (hte.course || "").split(/[/,]/).map(normalizeCourse);
    
    // Search term matching
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      natureOfBusiness.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Course filter
    const matchesCourse =
      selectedCourse === "All" ||
      hteCourses.includes(normalizeCourse(selectedCourse));
    
    // Location filter (city/province from address)
    const matchesLocation =
      selectedLocation === "All" ||
      address.toLowerCase().includes(selectedLocation.toLowerCase());
    
    // Industry/Nature of Business filter
    const matchesIndustry =
      selectedIndustry === "All" ||
      natureOfBusiness.toLowerCase().includes(selectedIndustry.toLowerCase());
    
    // MOA Status filter
    const now = new Date();
    const isExpired = hte.moaEndDate?.toDate() < now;
    const daysUntilExpiry = hte.moaEndDate ? Math.ceil((hte.moaEndDate.toDate() - now) / (1000 * 60 * 60 * 24)) : null;
    
    let matchesMoaStatus = true;
    if (moaStatus === "Active") {
      matchesMoaStatus = !isExpired;
    } else if (moaStatus === "Expired") {
      matchesMoaStatus = isExpired;
    } else if (moaStatus === "Expiring Soon") {
      matchesMoaStatus = !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 90;
    } else if (moaStatus === "Critical") {
      matchesMoaStatus = !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 30;
    }
    
    if (isAdmin) {
      const matchesExpiry = showExpired ? isExpired : !isExpired;
      return matchesSearch && matchesCourse && matchesLocation && matchesIndustry && matchesMoaStatus && matchesExpiry;
    }
    return matchesSearch && matchesCourse && matchesLocation && matchesIndustry && matchesMoaStatus;
  });

  if (loading || checkingVerification)
    return (
      <div className="loading-screen">
        <div className="loading-text">
          {checkingVerification ? "Checking verification status..." : "Loading InternIskolar..."}
        </div>
      </div>
    );
    
  // If auth service is not available, show error
  if (!auth && !loading) 
    return (
      <div className="loading-screen">
        <div className="loading-text">
          <h2>Connection Error</h2>
          <p>Unable to connect to the authentication service.</p>
          <br />
          <p><strong>Possible solutions:</strong></p>
          <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            <li>Refresh the page and try again</li>
            <li>Check your internet connection</li>
            <li>Clear your browser cache and cookies</li>
            <li>Try accessing the site in incognito/private mode</li>
          </ul>
          <br />
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
    
  if (!user) return <AuthScreen auth={auth} />;
  if (!user.emailVerified)
    return <VerifyEmailScreen user={user} onLogout={handleLogout} />;

  return (
    <div className="app-container">
      <Navbar
        user={user}
        onLogout={handleLogout}
        setPage={setPage}
        isAdmin={isAdmin}
      />
      <main className="main-content">
        {page === "dashboard" && (
          <Dashboard
            htes={filteredHtes}
            allHtes={allHtes}
            isAdmin={isAdmin}
            profile={profile}
            openModal={openModal}
            handleDelete={handleDelete}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showExpired={showExpired}
            setShowExpired={setShowExpired}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            selectedIndustry={selectedIndustry}
            setSelectedIndustry={setSelectedIndustry}
            moaStatus={moaStatus}
            setMoaStatus={setMoaStatus}
            onApplicationStatusUpdate={handleApplicationStatusUpdate}
          />
        )}
        {page === "analytics" && isAdmin && (
          <AdminAnalytics
            analytics={adminAnalytics}
            allHtes={allHtes}
            openModal={openModal}
          />
        )}
        {page === "contact" && (
          <ContactPage
            user={user}
            profile={profile}
            feedbackForm={feedbackForm}
            setFeedbackForm={setFeedbackForm}
            onFeedbackSubmit={handleFeedbackSubmit}
            feedbackMessage={feedbackMessage}
            setFeedbackMessage={setFeedbackMessage}
            isAdmin={isAdmin}
            feedbackRequests={feedbackRequests}
            onMarkAsRead={handleFeedbackMarkAsRead}
            onStatusUpdate={handleFeedbackStatusUpdate}
            onDelete={handleFeedbackDelete}
          />
        )}
        {page === "templates" && <TemplatesSection />}
        {page === "profile" && (
          <ProfilePage
            user={user}
            profile={profile}
            db={db}
            storage={storage}
          />
        )}
        {page === "applications" && (
          <ApplicationsPage
            allHtes={allHtes}
            profile={profile}
            onApplicationStatusUpdate={handleApplicationStatusUpdate}
          />
        )}
      </main>
      {isModalOpen && isAdmin && (
        <HteFormModal
          closeModal={closeModal}
          formData={formData}
          handleFormChange={handleFormChange}
          handleFormSubmit={handleFormSubmit}
          editingHte={editingHte}
        />
      )}
    </div>
  );
}

// --- Authentication & Profile Components ---

function AuthScreen({ auth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Show error if auth is not available
  if (!auth) {
    return (
      <div className="auth-screen">
        <div className="auth-container">
          <div className="auth-header">
            <GraduationCap className="auth-icon" />
            <h1>InternIskolar</h1>
            <p>Service Unavailable</p>
          </div>
          <div className="alert error">
            <AlertTriangle className="alert-icon" />
            <div>
              <p><strong>Unable to connect to authentication service.</strong></p>
              <p>This usually happens when the app is first loading or due to network issues.</p>
              <br />
              <p><strong>Please try:</strong></p>
              <ul style={{ textAlign: 'left', margin: '0.5rem 0' }}>
                <li>Refreshing the page</li>
                <li>Checking your internet connection</li>
                <li>Clearing browser cache if the issue persists</li>
              </ul>
              <button 
                onClick={() => window.location.reload()} 
                className="btn btn-primary"
                style={{ marginTop: '1rem', width: '100%' }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    // Check if auth is properly initialized
    if (!auth) {
      setError("Authentication service is not available. Please refresh the page and try again.");
      return;
    }
    
    // Allow @pup.edu.ph, @iskolarngbayan.pup.edu.ph, and @gmail.com
    const isValidEmail = 
      email.endsWith("@pup.edu.ph") ||
      email.endsWith("@iskolarngbayan.pup.edu.ph") ||
      email.endsWith("@gmail.com");
    
    if (!isValidEmail) {
      setError(
        "Please use a valid email address (@pup.edu.ph, @iskolarngbayan.pup.edu.ph, or @gmail.com)."
      );
      return;
    }
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await sendEmailVerification(userCredential.user);
        setMessage(
          "Verification email sent! Please check your inbox to continue."
        );
        await signOut(auth);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      
      // Provide user-friendly error messages
      let errorMessage = err.message;
      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email address already exists.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters long.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <GraduationCap className="auth-icon" />
          <h1>InternIskolar</h1>
          <p>{isLogin ? "Sign in to your account" : "Create a new account"}</p>
        </div>
        <form onSubmit={handleAuthAction} className="auth-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            className="auth-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="auth-input"
          />
          {error && (
            <div className="alert error">
              <AlertTriangle className="alert-icon" />
              {error}
            </div>
          )}
          {message && (
            <div className="alert success">
              <CheckCircle className="alert-icon" />
              {message}
            </div>
          )}
          <button type="submit" className="auth-button">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>
        <p className="auth-toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setMessage("");
            }}
            className="auth-toggle-button"
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
      
      {/* Footer only on auth screen */}
      <footer className="auth-footer">
        <p className="auth-footer-text">
          Developed by{' '}
          <a 
            href="https://www.linkedin.com/in/oliver-revelo/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="auth-footer-link"
          >
            Oliver A. Revelo
          </a>
        </p>
      </footer>
    </div>
  );
}

function VerifyEmailScreen({ user, onLogout }) {
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  
  const resendVerification = async () => {
    try {
      await sendEmailVerification(user);
      setMessage("A new verification email has been sent.");
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const checkVerification = async () => {
    setChecking(true);
    setMessage("Checking verification status...");
    try {
      await user.reload();
      if (user.emailVerified) {
        setMessage("Email verified! Redirecting...");
        // The auth state change will handle the redirect
      } else {
        setMessage("Email not yet verified. Please check your email and try again.");
      }
    } catch (error) {
      setMessage(`Error checking verification: ${error.message}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="verify-screen">
      <div className="verify-container">
        <Mail className="verify-icon" />
        <h1>Verify Your Email</h1>
        <p>
          A verification link has been sent to{" "}
          <span className="bold-text">{user.email}</span>. Please check your
          inbox (and spam folder) and click the link to activate your account.
        </p>
        <p className="verify-subtext">
          After clicking the verification link in your email, click "Check Verification" below.
        </p>
        {message && (
          <div className={`alert ${message.includes("Error") ? "error" : "success"}`}>
            {message}
          </div>
        )}
        <div className="verify-actions">
          <button onClick={onLogout} className="btn btn-danger">
            Logout
          </button>
          <button onClick={resendVerification} className="btn btn-secondary">
            Resend Email
          </button>
          <button 
            onClick={checkVerification} 
            className="btn btn-primary"
            disabled={checking}
          >
            {checking ? "Checking..." : "Check Verification"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user, profile, db, storage }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
    }
  }, [profile]);

  const handleFileChange = (e) => {
    if (e.target.files[0] && e.target.files[0].type === "application/pdf") {
      setFile(e.target.files[0]);
      setMessage("");
    } else {
      setFile(null);
      setMessage("Please select a PDF file.");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!db || !user) return;

    const profileDocRef = doc(db, "profiles", user.uid);

    try {
      await setDoc(profileDocRef, { name: name }, { merge: true });

      if (file) {
        const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error("Upload error:", error);
            setMessage("Error uploading file.");
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then(
              async (downloadURL) => {
                await setDoc(
                  profileDocRef,
                  { resumeUrl: downloadURL, resumeFileName: file.name },
                  { merge: true }
                );
                setMessage("Profile updated successfully!");
                setFile(null);
                setUploadProgress(0);
              }
            );
          }
        );
      } else {
        setMessage("Profile name updated!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Error updating profile.");
    }
  };

  return (
    <div>
      <h1 className="page-heading">Your Profile</h1>
      <div className="profile-container">
        <form onSubmit={handleProfileUpdate} className="profile-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" value={user.email} disabled />
          </div>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="resume">Upload Resume (PDF only)</label>
            <input
              type="file"
              id="resume"
              onChange={handleFileChange}
              accept=".pdf"
            />
            {uploadProgress > 0 && (
              <progress value={uploadProgress} max="100" />
            )}
            {profile?.resumeUrl && (
              <p className="current-resume">
                Current Resume:{" "}
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {profile.resumeFileName || "View Resume"}
                </a>
              </p>
            )}
          </div>
          {message && (
            <div
              className={`alert ${
                message.includes("Error") ? "error" : "success"
              }`}
            >
              {message}
            </div>
          )}
          <button type="submit" className="btn btn-primary">
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Other Components ---

function Navbar({ user, onLogout, setPage, isAdmin }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setIsMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <GraduationCap className="navbar-icon" />
          <span>InternIskolar</span>
        </div>
        <nav className={`navbar-nav ${isMenuOpen ? "open" : ""}`}>
          <button
            onClick={() => handlePageChange("dashboard")}
            className="nav-link"
          >
            Dashboard
          </button>
          {isAdmin && (
            <button
              onClick={() => handlePageChange("analytics")}
              className="nav-link"
            >
              Analytics
            </button>
          )}
          {!isAdmin && (
            <button
              onClick={() => handlePageChange("applications")}
              className="nav-link"
            >
              My Applications
            </button>
          )}
          <button
            onClick={() => handlePageChange("templates")}
            className="nav-link"
          >
            Templates
          </button>
          <button
            onClick={() => handlePageChange("contact")}
            className="nav-link"
          >
            {isAdmin ? "Contact Requests" : "Contact"}
          </button>
          {!isAdmin && (
            <button
              onClick={() => handlePageChange("profile")}
              className="nav-link"
            >
              Profile
            </button>
          )}
        </nav>
        <div className="navbar-user-section">
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            {isAdmin && <span className="admin-badge">ADMIN</span>}
          </div>
          <button onClick={onLogout} className="logout-button" title="Logout">
            <LogOut size={20} />
          </button>
          <button
            className="hamburger-menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Dashboard({
  htes,
  allHtes,
  isAdmin,
  profile,
  openModal,
  handleDelete,
  searchTerm,
  setSearchTerm,
  showExpired,
  setShowExpired,
  selectedCourse,
  setSelectedCourse,
  onApplicationStatusUpdate,
}) {
  const courses = [
    "All",
    ...new Set(
      allHtes
        .flatMap((hte) => (hte.course || "").split(/[/,]/))
        .map(normalizeCourse)
        .filter(
          (course) =>
            course && course.toUpperCase() !== "ALL ENGINEERING COURSET"
        )
    ),
  ].sort();

  return (
    <div>
      <h1 className="page-heading">Host Training Establishments</h1>
      {isAdmin && (
        <div className="dashboard-header">
          <button
            onClick={() => openModal()}
            className="btn btn-primary add-hte-btn"
          >
            <PlusCircle size={20} /> Add New HTE
          </button>
        </div>
      )}
      <div className="search-filter-bar">
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by company name, address, or nature of business..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          className="course-filter"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          {courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
        {isAdmin && (
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
            />
            <span className="slider"></span>
            <span className="toggle-label">Show Expired</span>
          </label>
        )}
      </div>
      <div className="hte-grid">
        {htes.length > 0 ? (
          htes.map((hte) => (
            <HteCard
              key={hte.id}
              hte={hte}
              isAdmin={isAdmin}
              profile={profile}
              onEdit={openModal}
              onDelete={handleDelete}
              onApplicationStatusUpdate={onApplicationStatusUpdate}
            />
          ))
        ) : (
          <p className="no-results">No HTEs found that match your criteria.</p>
        )}
      </div>
    </div>
  );
}

function HteCard({
  hte,
  isAdmin,
  profile,
  onEdit,
  onDelete,
  onApplicationStatusUpdate,
}) {
  const isExpired = hte.moaEndDate?.toDate() < new Date();
  
  // Handle both legacy and new format
  const applications = profile?.shortlist || [];
  let currentApplication = null;
  
  if (applications.length > 0) {
    if (typeof applications[0] === 'string') {
      // Legacy format
      currentApplication = applications.includes(hte.id) ? { hteId: hte.id, status: 'Interested' } : null;
    } else {
      // New format
      currentApplication = applications.find(app => app.hteId === hte.id) || null;
    }
  }

  const cardClasses = `hte-card ${isExpired ? "expired" : "active"}`;
  const headerClasses = `hte-card-header ${
    isExpired ? "expired-bg" : "active-bg"
  }`;
  const expiryTextClasses = `expiry-text ${
    isExpired ? "expired-text" : "active-text"
  }`;

  const createGmailLink = () => {
    const companyName = hte.name;
    const contactPerson = hte.contactPerson || "Hiring Manager";
    const to = hte.email;

    if (isAdmin) {
      // Admin email template
      const isExpired = hte.moaEndDate?.toDate() < new Date();
      const expiryDate = hte.moaEndDate?.toDate().toLocaleDateString();
      
      let subject, body;
      
      if (isExpired) {
        // MOA expired - renewal needed
        subject = `MOA Renewal Required - ${companyName}`;
        body = `Dear ${contactPerson},\n\nGreetings from Polytechnic University of the Philippines!\n\nI hope this email finds you well.\n\nI am writing to inform you that the Memorandum of Agreement (MOA) between ${companyName} and PUP for our On-the-Job Training (OJT) program has expired on ${expiryDate}.\n\nWe value our partnership and would like to continue collaborating with your organization for our students' internship opportunities. To proceed with accepting new interns, we will need to renew our MOA.\n\nPlease let us know if you would like to proceed with the renewal process. We can arrange a meeting to discuss the terms and finalize the new agreement.\n\nThank you for your continued partnership with PUP.\n\nBest regards,\nPUP OJT Administration\nPolytechnic University of the Philippines`;
      } else {
        // Active MOA - general administrative communication
        const daysUntilExpiry = Math.ceil((hte.moaEndDate?.toDate() - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 90) {
          // MOA expiring soon
          subject = `MOA Renewal Reminder - ${companyName}`;
          body = `Dear ${contactPerson},\n\nGreetings from Polytechnic University of the Philippines!\n\nI hope this email finds you well.\n\nThis is a friendly reminder that the Memorandum of Agreement (MOA) between ${companyName} and PUP for our On-the-Job Training (OJT) program is set to expire on ${expiryDate} (approximately ${daysUntilExpiry} days from now).\n\nTo ensure uninterrupted collaboration and continue accepting our students for internship opportunities, we would like to initiate the MOA renewal process.\n\nWould you be available for a meeting to discuss the renewal terms? We can work together to update any necessary details and finalize the new agreement before the current one expires.\n\nThank you for your valued partnership with PUP.\n\nBest regards,\nPUP OJT Administration\nPolytechnic University of the Philippines`;
        } else {
          // General administrative contact
          subject = `PUP OJT Program Inquiry - ${companyName}`;
          body = `Dear ${contactPerson},\n\nGreetings from Polytechnic University of the Philippines!\n\nI hope this email finds you well.\n\nI am reaching out regarding our ongoing partnership through the On-the-Job Training (OJT) program. We appreciate your continued collaboration in providing valuable internship opportunities for our students.\n\nPlease feel free to contact us if you have any questions, concerns, or updates regarding our partnership or the internship program.\n\nThank you for your support of PUP students.\n\nBest regards,\nPUP OJT Administration\nPolytechnic University of the Philippines`;
        }
      }
      
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        to
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return gmailUrl;
    } else {
      // Student email template (existing)
      const studentName =
        profile?.name || "[Your Full Name - Please update in Profile]";
      const subject = `Internship Application - ${studentName}`;

      let resumeLine = "";
      if (profile?.resumeUrl) {
        resumeLine = `You can view my resume here: ${profile.resumeUrl}`;
      } else {
        resumeLine = "I would be happy to provide my resume upon your request.";
      }

      const body = `Dear ${contactPerson},\n\nI hope this email finds you well.\n\nMy name is ${studentName}, and I am a student from Polytechnic University of the Philippines. I am writing to express my strong interest in an internship opportunity at ${companyName}, which I found on our school's InternIskolar portal.\n\n${resumeLine}\n\nThank you for your time and consideration.\n\nSincerely,\n${studentName}`;

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        to
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return gmailUrl;
    }
  };

  const applicationStatuses = [
    { value: 'Interested', label: 'Interested', icon: Heart, color: '#6b7280' },
    { value: 'Applied', label: 'Applied', icon: Send, color: '#3b82f6' },
    { value: 'Interviewing', label: 'Interviewing', icon: MessageCircle, color: '#f59e0b' },
    { value: 'Offer Received', label: 'Offer Received', icon: CheckCircle2, color: '#10b981' },
    { value: 'Rejected', label: 'Rejected', icon: XCircle, color: '#ef4444' },
  ];

  const handleStatusChange = (newStatus) => {
    onApplicationStatusUpdate(hte.id, newStatus);
  };

  const handleRemoveApplication = () => {
    onApplicationStatusUpdate(hte.id, null);
  };

  return (
    <div className={cardClasses}>
      {!isAdmin && (
        <ApplicationStatusDropdown 
          currentApplication={currentApplication}
          applicationStatuses={applicationStatuses}
          onStatusChange={handleStatusChange}
          onRemove={handleRemoveApplication}
        />
      )}
      <div className={headerClasses}>
        <h3>
          <Building size={24} /> {hte.name}
        </h3>
        <p>{hte.address}</p>
      </div>
      <div className="hte-card-body">
        <p>
          <Users size={16} /> <span>{hte.contactPerson || "N/A"}</span>
        </p>
        <p>
          <Phone size={16} />{" "}
          <span>
            {hte.contactNumber || "N/A"} | {hte.email || "N/A"}
          </span>
        </p>
        {hte.natureOfBusiness && (
          <p>
            <Building size={16} /> <span>{hte.natureOfBusiness}</span>
          </p>
        )}
        <p>
          <BookOpen size={16} /> <span>{hte.course || "Any Course"}</span>
        </p>
        <p className={expiryTextClasses}>
          <Clock size={16} />{" "}
          <span>
            MOA Expires:{" "}
            {hte.moaEndDate
              ? hte.moaEndDate.toDate().toLocaleDateString()
              : "N/A"}
          </span>
        </p>
      </div>
      <div className="hte-card-footer">
        {hte.moaLink && (
          <a
            href={hte.moaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary moa-btn"
          >
            <ExternalLink size={16} /> View MOA
          </a>
        )}
        <a
          href={createGmailLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-success email-btn"
        >
          <Mail size={16} /> Email Company
        </a>
        {isAdmin && (
          <div className="admin-actions">
            <button onClick={() => onEdit(hte)} className="icon-btn">
              <Edit size={20} />
            </button>
            <button
              onClick={() => onDelete(hte.id)}
              className="icon-btn danger"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationStatusDropdown({ currentApplication, applicationStatuses, onStatusChange, onRemove }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentStatus = currentApplication?.status || null;
  const statusInfo = currentStatus ? applicationStatuses.find(s => s.value === currentStatus) : null;
  
  const handleStatusSelect = (status) => {
    onStatusChange(status);
    setIsOpen(false);
  };
  
  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove();
    setIsOpen(false);
  };

  return (
    <div className="application-status-dropdown">
      <button
        className={`status-btn ${currentStatus ? 'has-status' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ color: statusInfo?.color || '#6b7280' }}
      >
        {statusInfo ? (
          <>
            <statusInfo.icon size={16} />
            <span className="status-label">{statusInfo.label}</span>
          </>
        ) : (
          <>
            <Star size={16} />
            <span className="status-label">Track</span>
          </>
        )}
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="status-overlay" onClick={() => setIsOpen(false)} />
          <div className="status-dropdown">
            {applicationStatuses.map((status) => (
              <button
                key={status.value}
                className={`status-item ${currentStatus === status.value ? 'active' : ''}`}
                onClick={() => handleStatusSelect(status.value)}
                style={{ color: status.color }}
              >
                <status.icon size={16} />
                <span>{status.label}</span>
              </button>
            ))}
            {currentStatus && (
              <>
                <div className="status-divider" />
                <button className="status-item remove" onClick={handleRemove}>
                  <XCircle size={16} />
                  <span>Remove from tracker</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ApplicationsPage({ allHtes, profile, onApplicationStatusUpdate }) {
  // Handle both legacy and new format
  const applications = profile?.shortlist || [];
  const applicationStatuses = [
    { value: 'Interested', label: 'Interested', icon: Heart, color: '#6b7280' },
    { value: 'Applied', label: 'Applied', icon: Send, color: '#3b82f6' },
    { value: 'Interviewing', label: 'Interviewing', icon: MessageCircle, color: '#f59e0b' },
    { value: 'Offer Received', label: 'Offer Received', icon: CheckCircle2, color: '#10b981' },
    { value: 'Rejected', label: 'Rejected', icon: XCircle, color: '#ef4444' },
  ];

  // Initialize sections to be collapsed by default
  const [expandedSections, setExpandedSections] = useState(() => {
    const initialState = {};
    applicationStatuses.forEach(status => {
      initialState[status.value] = false;
    });
    return initialState;
  });

  // Normalize applications to new format
  let normalizedApplications = [];
  if (applications.length > 0) {
    if (typeof applications[0] === 'string') {
      // Legacy format - convert
      normalizedApplications = applications.map(id => ({ hteId: id, status: 'Interested' }));
    } else {
      // New format
      normalizedApplications = applications.filter(app => typeof app === 'object');
    }
  }

  // Group applications by status
  const groupedApplications = applicationStatuses.reduce((acc, status) => {
    acc[status.value] = normalizedApplications
      .filter(app => app.status === status.value)
      .map(app => allHtes.find(hte => hte.id === app.hteId))
      .filter(hte => hte); // Remove any undefined HTEs
    return acc;
  }, {});

  const totalApplications = normalizedApplications.length;

  const toggleSection = (statusValue) => {
    setExpandedSections(prev => ({
      ...prev,
      [statusValue]: !prev[statusValue]
    }));
  };

  const toggleAllSections = () => {
    const hasAnyExpanded = Object.values(expandedSections).some(expanded => expanded);
    const newState = {};
    applicationStatuses.forEach(status => {
      if (groupedApplications[status.value]?.length > 0) {
        newState[status.value] = !hasAnyExpanded;
      }
    });
    setExpandedSections(newState);
  };

  const hasAnyExpanded = Object.values(expandedSections).some(expanded => expanded);

  return (
    <div>
      <div className="applications-header-wrapper">
        <h1 className="page-heading">My Applications</h1>
        <div className="applications-header">
          <div className="applications-title">
            <p className="applications-count">
              {totalApplications} {totalApplications === 1 ? 'company' : 'companies'} tracked
            </p>
          </div>
          {totalApplications > 0 && (
            <button 
              onClick={toggleAllSections} 
              className="btn btn-secondary toggle-all-btn"
            >
              {hasAnyExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>
      </div>
      
      {totalApplications > 0 ? (
        <div className="applications-by-status">
          {applicationStatuses.map((status) => {
            const StatusIcon = status.icon;
            const companies = groupedApplications[status.value];
            const isExpanded = expandedSections[status.value];
            
            if (companies.length === 0) return null;
            
            return (
              <div key={status.value} className="status-section">
                <button 
                  className="status-header clickable" 
                  style={{ color: status.color }}
                  onClick={() => toggleSection(status.value)}
                >
                  <div className="status-title">
                    <StatusIcon size={20} />
                    <h2>{status.label} ({companies.length})</h2>
                  </div>
                  <ChevronDown 
                    size={20} 
                    className={`section-chevron ${isExpanded ? 'expanded' : ''}`}
                  />
                </button>
                {isExpanded && (
                  <div className="hte-grid status-content">
                    {companies.map((hte) => (
                      <HteCard
                        key={hte.id}
                        hte={hte}
                        isAdmin={false}
                        profile={profile}
                        onApplicationStatusUpdate={onApplicationStatusUpdate}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-applications">
          <Star size={48} className="no-applications-icon" />
          <h2>No applications tracked yet</h2>
          <p>
            Start tracking your internship applications by clicking the "Track" button on companies that interest you in the Dashboard.
          </p>
        </div>
      )}
    </div>
  );
}

function AdminAnalytics({ analytics, allHtes, openModal }) {
  const { 
    totalStudents, 
    expiringHTEs, 
    mostPopularHTEs, 
    activeHTEs, 
    expiredHTEs, 
    applicationStats 
  } = analytics;

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getUrgencyLabel = (urgency) => {
    switch (urgency) {
      case 'high': return 'Critical (≤30 days)';
      case 'medium': return 'Warning (31-60 days)';
      case 'low': return 'Notice (61-90 days)';
      default: return 'Unknown';
    }
  };

  return (
    <div className="admin-analytics">
      <div className="analytics-header">
        <h1 className="page-heading">Admin Analytics Dashboard</h1>
        <p className="analytics-subtitle">Overview of InternIskolar metrics and insights</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <Users size={24} className="metric-icon students" />
            <h3>Registered Students</h3>
          </div>
          <div className="metric-value">{totalStudents}</div>
          <div className="metric-label">Total students using InternIskolar</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <Building size={24} className="metric-icon active" />
            <h3>Active HTEs</h3>
          </div>
          <div className="metric-value">{activeHTEs}</div>
          <div className="metric-label">Companies with valid MOAs</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <AlertCircle size={24} className="metric-icon expired" />
            <h3>Expired HTEs</h3>
          </div>
          <div className="metric-value">{expiredHTEs}</div>
          <div className="metric-label">Companies needing MOA renewal</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <Clock size={24} className="metric-icon warning" />
            <h3>Expiring Soon</h3>
          </div>
          <div className="metric-value">{expiringHTEs.length}</div>
          <div className="metric-label">MOAs expiring within 90 days</div>
        </div>
      </div>

      {/* Application Status Statistics */}
      <div className="analytics-section">
        <h2>Application Statistics</h2>
        <div className="application-stats-grid">
          {Object.entries(applicationStats).map(([status, count]) => {
            const statusConfig = {
              'Interested': { icon: Heart, color: '#6b7280' },
              'Applied': { icon: Send, color: '#3b82f6' },
              'Interviewing': { icon: MessageCircle, color: '#f59e0b' },
              'Offer Received': { icon: CheckCircle2, color: '#10b981' },
              'Rejected': { icon: XCircle, color: '#ef4444' },
            };
            const config = statusConfig[status] || { icon: Activity, color: '#6b7280' };
            const StatusIcon = config.icon;

            return (
              <div key={status} className="stat-card">
                <div className="stat-header">
                  <StatusIcon size={20} style={{ color: config.color }} />
                  <span className="stat-label">{status}</span>
                </div>
                <div className="stat-value" style={{ color: config.color }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most Popular HTEs */}
      <div className="analytics-section">
        <h2>Most Popular Companies</h2>
        <div className="popular-htes">
          {mostPopularHTEs.length > 0 ? (
            <div className="popular-list">
              {mostPopularHTEs.map((item, index) => (
                <div key={item.hte.id} className="popular-item">
                  <div className="popular-rank">#{index + 1}</div>
                  <div className="popular-info">
                    <h4>{item.hte.name}</h4>
                    <p>{item.hte.address}</p>
                    <span className="popular-course">{item.hte.course || 'Any Course'}</span>
                  </div>
                  <div className="popular-stats">
                    <div className="popular-count">
                      <Eye size={16} />
                      <span>{item.applications} applications</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <TrendingUp size={48} className="no-data-icon" />
              <p>No application data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Expiring HTEs */}
      <div className="analytics-section">
        <h2>HTEs with Expiring MOAs</h2>
        <div className="expiring-htes">
          {expiringHTEs.length > 0 ? (
            <div className="expiring-list">
              {expiringHTEs.map((hte) => (
                <div key={hte.id} className="expiring-item">
                  <div className="expiring-urgency">
                    <div 
                      className="urgency-dot" 
                      style={{ backgroundColor: getUrgencyColor(hte.urgency) }}
                    ></div>
                    <span className="urgency-label">{getUrgencyLabel(hte.urgency)}</span>
                  </div>
                  <div className="expiring-info">
                    <h4>{hte.name}</h4>
                    <p>{hte.address}</p>
                    <div className="expiring-details">
                      <span className="expiring-course">{hte.course || 'Any Course'}</span>
                      <span className="expiring-contact">{hte.contactPerson}</span>
                    </div>
                  </div>
                  <div className="expiring-timeline">
                    <div className="days-remaining">
                      <Calendar size={16} />
                      <span>{hte.daysUntilExpiry} days</span>
                    </div>
                    <div className="expiry-date">
                      {hte.moaEndDate.toDate().toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => openModal(hte)}
                      className="btn btn-primary btn-sm"
                    >
                      <Edit size={14} />
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <CheckCircle size={48} className="no-data-icon success" />
              <p>All HTEs have valid MOAs for the next 90 days</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplatesSection() {
  const templates = [
    {
      name: "OJT-MOA HTE x PUP_VPAA_2024",
      url: "/templates/OJT-MOA HTE x PUP_VPAA_2024.docx",
    },
    {
      name: "PUP Internship Agreement 2024",
      url: "/templates/PUP Internship Agreement 2024.docx",
    },
    {
      name: "PUP Consent Form 2024",
      url: "/templates/PUP Consent Form_2024.docx",
    },
    {
      name: "Declaration of Medical Information and Data Subject Consent Form",
      url: "/templates/Declaration-of-Medical-Information-and-Data-Subject-Consent-Form.pdf",
    },
    {
      name: "Intent Letter (for 1 student)",
      url: "/templates/Intent Letter_for 1 student.docx",
    },
    {
      name: "Intent Letter (for 2 or more students)",
      url: "/templates/Intent Letter_for 2 or more students.docx",
    },
    {
      name: "PUP Medical Health Information Form for Students 2022",
      url: "/templates/PUP-Medical-Health-Information-Form-for-Students-2022.pdf",
    },
    {
      name: "Daily Time Record (DTR)",
      url: "/templates/Daily Time Record (DTR).docx",
    },
    {
      name: "Weekly Accomplishment Report Template",
      url: "/templates/Weekly Accomplishment Report_Template.docx",
    },
    {
      name: "Evaluation Instrument for Training Supervisor",
      url: "/templates/EVALUATION-INSTRUMENT-for-TRAINING-SUPERVISOR_FINAL.docx",
    },
    {
      name: "Evaluation Instrument for HTE (for Students)",
      url: "/templates/Evaluation-Instrument-for-HTE_Final-FOR-STUDENTS.docx",
    },
    {
      name: "Overtime Agreement Template",
      url: "/templates/OVERTIME AGREEMENT TEMPLATE.docx",
    },
    {
      name: "Guidelines for Submission of OJT Portfolio",
      url: "/templates/GUIDELINES-FOR-SUBMISSION-OF-OJT-PORTFOLIO.pdf",
    },
    { name: "Insurance Information", url: "/templates/insurance.pdf" },
  ];
  return (
    <div>
      <h1 className="page-heading">Downloadable Templates</h1>
      <div className="templates-container">
        <ul>
          {templates.map((template, index) => (
            <li key={index}>
              <div>
                <FileText className="template-icon" />
                <span>{template.name}</span>
              </div>
              <a href={template.url} download className="btn btn-success">
                Download
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HteFormModal({
  closeModal,
  formData,
  handleFormChange,
  handleFormSubmit,
  editingHte,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingHte ? "Edit HTE" : "Add New HTE"}</h2>
          <button onClick={closeModal} className="close-btn">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleFormSubmit}>
          <div className="modal-body">
            <div>
              <label htmlFor="name">Company Name</label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="address">Company Address</label>
              <input
                type="text"
                name="address"
                id="address"
                value={formData.address}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="natureOfBusiness">Nature of Business</label>
              <input
                type="text"
                name="natureOfBusiness"
                id="natureOfBusiness"
                value={formData.natureOfBusiness}
                onChange={handleFormChange}
                placeholder="e.g., IT Services, Manufacturing, Healthcare"
              />
            </div>
            <div>
              <label htmlFor="course">Course/s</label>
              <input
                type="text"
                name="course"
                id="course"
                value={formData.course}
                onChange={handleFormChange}
                placeholder="e.g., DIT, DCPET, DEET"
              />
            </div>
            <div>
              <label htmlFor="contactPerson">Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                id="contactPerson"
                value={formData.contactPerson}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="contactNumber">Contact Number</label>
              <input
                type="tel"
                name="contactNumber"
                id="contactNumber"
                value={formData.contactNumber}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label htmlFor="moaLink">MOA Link</label>
              <input
                type="url"
                name="moaLink"
                id="moaLink"
                value={formData.moaLink}
                onChange={handleFormChange}
                placeholder="https://..."
              />
            </div>
            <div>
              <label htmlFor="moaEndDate">MOA Expiration Date</label>
              <input
                type="date"
                name="moaEndDate"
                id="moaEndDate"
                value={formData.moaEndDate}
                onChange={handleFormChange}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              onClick={closeModal}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingHte ? "Save Changes" : "Add HTE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContactPage({
  user,
  profile,
  feedbackForm,
  setFeedbackForm,
  onFeedbackSubmit,
  feedbackMessage,
  setFeedbackMessage,
  isAdmin,
  feedbackRequests,
  onMarkAsRead,
  onStatusUpdate,
  onDelete,
}) {
  const handleFormChange = (e) => {
    setFeedbackForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in-progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'template': return FileText;
      case 'suggestion': return MessageSquare;
      case 'bug': return AlertTriangle;
      default: return MessageCircle;
    }
  };

  if (isAdmin) {
    const unreadCount = feedbackRequests.filter(req => !req.isRead).length;

    return (
      <div>
        <div className="analytics-header">
          <h1 className="page-heading">Contact Requests</h1>
          <p className="analytics-subtitle">Overview of student feedback and support requests</p>
        </div>

        <div className="contact-stats">
          <span className="contact-total">{feedbackRequests.length} total requests</span>
          {unreadCount > 0 && (
            <span className="contact-unread">{unreadCount} unread</span>
          )}
        </div>

        {feedbackRequests.length > 0 ? (
          <div className="contact-requests-list">
            {feedbackRequests.map((request) => {
              const TypeIcon = getTypeIcon(request.type);
              return (
                <div
                  key={request.id}
                  className={`contact-request-card ${!request.isRead ? 'unread' : ''}`}
                >
                  <div className="request-header">
                    <div className="request-type">
                      <TypeIcon size={20} />
                      <span className="type-label">
                        {request.type === 'template' ? 'Template Request' :
                         request.type === 'suggestion' ? 'Website Suggestion' :
                         request.type === 'bug' ? 'Bug Report' : 'Other'}
                      </span>
                      {!request.isRead && <span className="unread-badge">New</span>}
                    </div>
                    <div className="request-actions">
                      <select
                        value={request.status}
                        onChange={(e) => onStatusUpdate(request.id, e.target.value)}
                        className="status-select"
                        style={{ color: getStatusColor(request.status) }}
                      >
                        <option value="pending">Pending Review</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button
                        onClick={() => onDelete(request.id)}
                        className="icon-btn danger"
                        title="Delete request"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="request-content">
                    <h3 className="request-subject">{request.subject}</h3>
                    <p className="request-message">{request.message}</p>
                  </div>

                  <div className="request-footer">
                    <div className="request-user">
                      <Users size={16} />
                      <span>{request.userName} ({request.userEmail})</span>
                    </div>
                    <div className="request-date">
                      <Clock size={16} />
                      <span>{request.timestamp?.toDate().toLocaleDateString()}</span>
                    </div>
                    {!request.isRead && (
                      <button
                        onClick={() => onMarkAsRead(request.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-contact-requests">
            <MessageSquare size={48} className="no-requests-icon" />
            <h2>No contact requests yet</h2>
            <p>Student feedback and requests will appear here.</p>
          </div>
        )}
      </div>
    );
  }

  // Student view
  return (
    <div>
      <h1 className="page-heading">Contact & Feedback</h1>
      <div className="contact-container">
        <form onSubmit={onFeedbackSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="type">Request Type</label>
            <select
              name="type"
              id="type"
              value={feedbackForm.type}
              onChange={handleFormChange}
              required
              className="contact-select"
            >
              <option value="template">Template Request</option>
              <option value="suggestion">Website Suggestion</option>
              <option value="bug">Bug Report</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              name="subject"
              id="subject"
              value={feedbackForm.subject}
              onChange={handleFormChange}
              placeholder="Brief description of your request"
              required
              className="contact-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              name="message"
              id="message"
              value={feedbackForm.message}
              onChange={handleFormChange}
              placeholder="Please provide detailed information about your request or suggestion..."
              required
              rows={6}
              className="contact-textarea"
            />
          </div>

          <div className="contact-user-info">
            <p><strong>Your Name:</strong> {profile?.name || 'Not set'}</p>
            <p><strong>Your Email:</strong> {user.email}</p>
          </div>

          <button type="submit" className="btn btn-primary contact-submit">
            <Send size={20} />
            Submit Request
          </button>
        </form>

        {feedbackMessage.text && (
          <div className={`alert ${feedbackMessage.type}`} style={{ 
            marginBottom: '2rem',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {feedbackMessage.type === 'success' ? (
              <CheckCircle className="alert-icon" />
            ) : (
              <AlertTriangle className="alert-icon" />
            )}
            {feedbackMessage.text}
            <button
              onClick={() => setFeedbackMessage({ text: '', type: '' })}
              className="alert-close-btn"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                marginLeft: 'auto',
                padding: '0.25rem',
                fontSize: '1.2rem',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="contact-help">
          <h3>What can you request?</h3>
          <ul>
            <li><strong>Template Requests:</strong> Need a specific document template that's not available?</li>
            <li><strong>Website Suggestions:</strong> Ideas to improve the portal's functionality or user experience</li>
            <li><strong>Bug Reports:</strong> Found something not working correctly? Let us know!</li>
            <li><strong>General Feedback:</strong> Any other thoughts or suggestions about InternIskolar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

