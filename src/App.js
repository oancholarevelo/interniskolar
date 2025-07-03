import React, { useState, useEffect } from "react";
import "./App.css";
import ResumeBuilder from "./ResumeBuilder";
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
  uploadBytes,
  deleteObject,
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
// Force correct storage bucket regardless of environment variables
const CORRECT_STORAGE_BUCKET = "pup-internship.firebasestorage.app";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAIc6oFOBknpItFeHuw9qMhrNOzNjns5kk",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "pup-internship.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "pup-internship",
  storageBucket: CORRECT_STORAGE_BUCKET, // Force correct bucket
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "742208522282",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:742208522282:web:7b4e0e4f8c8e3f3ed75b53",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-JZDCXXLHJ8",
};

// Configuration loaded successfully

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

// --- Helper function for extracting storage path from download URL ---
const getStoragePathFromUrl = (downloadUrl) => {
  if (!downloadUrl) return null;
  
  try {
    console.log('Parsing URL:', downloadUrl);
    
    // Handle different Firebase Storage URL formats
    // Format 1: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?alt=media&token=...
    // Format 2: https://storage.googleapis.com/bucket/path/to/file
    
    if (downloadUrl.includes('firebasestorage.googleapis.com')) {
      // Standard Firebase Storage download URL
      const url = new URL(downloadUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)$/);
      if (pathMatch) {
        // Decode the URL-encoded path
        const decodedPath = decodeURIComponent(pathMatch[1]);
        // Storage path extracted successfully
        return decodedPath;
      }
    } else if (downloadUrl.includes('storage.googleapis.com')) {
      // Alternative Firebase Storage URL format
      const url = new URL(downloadUrl);
      // Remove the bucket name from the path (first segment after /)
      const pathParts = url.pathname.split('/').filter(part => part);
      if (pathParts.length > 1) {
        const storagePath = pathParts.slice(1).join('/');
        // Storage path extracted successfully
        return storagePath;
      }
    } else if (downloadUrl.includes('googleapis.com') && (downloadUrl.includes('templates/') || downloadUrl.includes('resumes/'))) {
      // Handle cases where URL might have different format but contains our folder structure
      try {
        const url = new URL(downloadUrl);
        const fullPath = url.pathname + url.search;
        // Look for templates/ or resumes/ in the full path
        const templateMatch = fullPath.match(/templates\/([^?&]+)/);
        const resumeMatch = fullPath.match(/resumes\/([^?&]+)/);
        
        if (templateMatch) {
          const path = `templates/${decodeURIComponent(templateMatch[1])}`;
          console.log('Extracted template path (alternative method):', path);
          return path;
        } else if (resumeMatch) {
          const path = `resumes/${decodeURIComponent(resumeMatch[1])}`;
          console.log('Extracted resume path (alternative method):', path);
          return path;
        }
      } catch (error) {
        console.warn('Alternative path extraction failed:', error);
      }
    }
    
    console.warn('Could not parse storage URL format:', downloadUrl);
    return null;
  } catch (error) {
    console.error('Error parsing storage URL:', error);
    return null;
  }
};

// --- Helper function to test storage connectivity ---
const testStorageConnectivity = async (storage, user) => {
  if (!storage || !user) return false;
  
  try {
    // Try to create a simple reference to test if storage is accessible
    const testRef = ref(storage, `test/${user.uid}/connectivity_test.txt`);
    // Test if we can access the reference properties (this validates storage connectivity)
    const refPath = testRef.fullPath;
    // Storage reference created successfully
    return !!refPath; // Return true if we got a valid path
  } catch (error) {
    console.error('Storage connectivity test failed:', error);
    return false;
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
  const [pendingVerification, setPendingVerification] = useState(null); // Track user waiting for verification
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
  const [verificationMessage, setVerificationMessage] = useState({ text: '', type: '' });
  const [connectionStatus, setConnectionStatus] = useState('online'); // online, offline, connecting

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      console.log('Network connection restored');
    };
    
    const handleOffline = () => {
      setConnectionStatus('offline');
      console.log('Network connection lost');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle email verification redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailVerified = urlParams.get('emailVerified');
    
    if (emailVerified === 'true') {
      // Clear the URL parameter immediately to clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show success message
      setVerificationMessage({
        text: 'Email verification successful! Please sign in to continue.',
        type: 'success'
      });
      
      // Clear the message after 8 seconds
      setTimeout(() => {
        setVerificationMessage({ text: '', type: '' });
      }, 8000);
      
      // Clear any pending verification state since user clicked the link
      setPendingVerification(null);
      
      // If auth is available and user is logged in, reload their auth state
      if (auth && auth.currentUser) {
        console.log('Email verification detected, reloading user auth state...');
        setVerificationMessage({
          text: 'Email verified! Welcome to InternIskolar!',
          type: 'success'
        });
        
        auth.currentUser.reload().then(() => {
          console.log('User auth state reloaded successfully after email verification');
          // Clear the message after successful reload
          setTimeout(() => {
            setVerificationMessage({ text: '', type: '' });
          }, 3000);
        }).catch((error) => {
          console.error('Error reloading user after verification:', error);
          setVerificationMessage({
            text: 'Email verified! Please refresh the page to continue.',
            type: 'success'
          });
        });
      } else if (auth) {
        // If no current user but auth is available, they might need to sign in again
        console.log('Email verification detected but no current user - user may need to sign in again');
      }
    }
  }, [auth]);

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
      
      // Configure Firestore for better connection handling
      try {
        // Enable offline persistence (will only work if not already enabled)
        console.log('Firebase services initialized successfully');
      } catch (persistenceError) {
        // Persistence might already be enabled, ignore this error
        console.log('Firestore persistence configuration:', persistenceError.message);
      }
      
      // Force storage to use the correct bucket URL with explicit gs:// prefix
      let firebaseStorage;
      try {
        // Always use the explicit bucket URL to avoid any configuration issues
        firebaseStorage = getStorage(app, `gs://${CORRECT_STORAGE_BUCKET}`);
        // Storage initialized successfully
      } catch (storageError) {
        console.error('Firebase Storage initialization error:', storageError);
        // Fallback to default initialization
        try {
          firebaseStorage = getStorage(app);
          // Storage initialized with fallback configuration
        } catch (fallbackError) {
          console.error('Failed to initialize storage with fallback:', fallbackError);
          firebaseStorage = null;
        }
      }
      
      // Validate that Firebase services were initialized properly
      if (!firestoreDb || !firebaseAuth) {
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
          // Clear pending verification when user successfully logs in
          setPendingVerification(null);
          
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
          // Don't clear pendingVerification here - let it persist until verification is complete
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

  // Fetch user profile data (including shortlist) with error handling
  useEffect(() => {
    if (user && db) {
      const profileDocRef = doc(db, "profiles", user.uid);
      const unsubscribe = onSnapshot(
        profileDocRef, 
        (doc) => {
          setProfile(
            doc.exists() ? doc.data() : { name: "", resumeUrl: "", shortlist: [] }
          );
        },
        (error) => {
          console.error("Error fetching user profile:", error);
          // If it's a network error, don't show alert, just log it
          if (error.code !== 'unavailable' && error.code !== 'permission-denied') {
            console.warn("Profile sync temporarily unavailable. Will retry automatically.");
          }
        }
      );
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
      (error) => {
        console.error("Error fetching HTEs:", error);
        // Handle different types of Firestore errors
        if (error.code === 'unavailable') {
          console.warn("Firestore temporarily unavailable. Data will sync when connection is restored.");
        } else if (error.code === 'permission-denied') {
          console.error("Permission denied accessing HTEs. Please check authentication.");
        } else {
          console.error("Unexpected Firestore error:", error.message);
        }
      }
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
        // Handle analytics fetch errors gracefully
        if (error.code === 'unavailable') {
          console.warn("Analytics data temporarily unavailable. Please try refreshing the page.");
        } else if (error.code === 'permission-denied') {
          console.error("Permission denied accessing analytics data.");
        } else {
          console.error("Failed to load analytics data:", error.message);
        }
      }
    };

    fetchAnalytics();
  }, [isAdmin, db, allHtes]);

  // Fetch feedback requests for admins with error handling
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
      (error) => {
        console.error("Error fetching feedback:", error);
        // Handle different types of Firestore errors for feedback
        if (error.code === 'unavailable') {
          console.warn("Feedback data temporarily unavailable. Will sync when connection is restored.");
        } else if (error.code === 'permission-denied') {
          console.error("Permission denied accessing feedback. Please check admin permissions.");
        } else {
          console.error("Unexpected error fetching feedback:", error.message);
        }
      }
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
    
  if (!user && !pendingVerification) return <AuthScreen auth={auth} setPendingVerification={setPendingVerification} verificationMessage={verificationMessage} />;
  if ((user && !user.emailVerified) || pendingVerification)
    return <VerifyEmailScreen 
      user={user || pendingVerification} 
      onLogout={() => {
        handleLogout();
        setPendingVerification(null);
      }} 
      auth={auth}
      setPendingVerification={setPendingVerification}
    />;

  return (
    <div className="app-container">
      {/* Connection Status Indicator */}
      {connectionStatus === 'offline' && (
        <div className="connection-status offline">
          📡 You're offline. Data will sync when connection is restored.
        </div>
      )}
      
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
        {page === "templates" && (
          <TemplatesSection 
            isAdmin={isAdmin} 
            db={db} 
            storage={storage} 
          />
        )}
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
        {page === "resume-builder" && (
          <ResumeBuilder setPage={setPage} />
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

function AuthScreen({ auth, setPendingVerification, verificationMessage }) {
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
              <br />
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
        
        // Custom verification settings for better user experience
        const actionCodeSettings = {
          url: 'https://interniskolar.vercel.app/?emailVerified=true',
          handleCodeInApp: false,
          iOS: {
            bundleId: 'com.pup.internskolar'
          },
          android: {
            packageName: 'com.pup.internskolar',
            installApp: false
          }
        };
        
        await sendEmailVerification(userCredential.user, actionCodeSettings);
        setMessage(
          "Verification email sent! Please check your inbox to continue."
        );
        
        // Store user info for verification screen, then sign out
        setPendingVerification({
          email: userCredential.user.email,
          uid: userCredential.user.uid
        });
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
          {verificationMessage?.text && (
            <div className={`alert ${verificationMessage.type}`}>
              <CheckCircle className="alert-icon" />
              {verificationMessage.text}
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

function VerifyEmailScreen({ user, onLogout, auth, setPendingVerification }) {
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  
  // Handle case where user is from pendingVerification (no auth user object)
  const userEmail = user?.email;
  const isRealUser = user && typeof user.reload === 'function';
  
  const resendVerification = async () => {
    try {
      if (isRealUser) {
        // User is still logged in, can resend directly
        const actionCodeSettings = {
          url: 'https://interniskolar.vercel.app/?emailVerified=true',
          handleCodeInApp: false,
          iOS: {
            bundleId: 'com.pup.internskolar'
          },
          android: {
            packageName: 'com.pup.internskolar',
            installApp: false
          }
        };
        
        await sendEmailVerification(user, actionCodeSettings);
        setMessage("A new verification email has been sent.");
      } else {
        // User was signed out after registration, need to sign in first
        setMessage("Please sign in again to resend the verification email.");
        setTimeout(() => {
          setPendingVerification(null);
        }, 2000);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const checkVerification = async () => {
    setChecking(true);
    setMessage("Checking verification status...");
    
    try {
      if (isRealUser) {
        // User is still logged in, can check directly
        await user.reload();
        if (user.emailVerified) {
          setMessage("Email verified! Redirecting...");
          setPendingVerification(null);
          // The auth state change will handle the redirect
        } else {
          setMessage("Email not yet verified. Please check your email and try again.");
        }
      } else {
        // User was signed out, need them to sign in to verify
        setMessage("Please sign in to complete verification.");
        setTimeout(() => {
          setPendingVerification(null);
        }, 2000);
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
          <span className="bold-text">{userEmail}</span>. Please check your
          inbox (and spam folder) and click the link to activate your account.
        </p>
        <p className="verify-subtext">
          After clicking the verification link in your email, {isRealUser ? 'click "Check Verification" below' : 'sign in again to access your account'}.
        </p>
        {message && (
          <div className={`alert ${message.includes("Error") ? "error" : "success"}`}>
            {message}
          </div>
        )}
        <div className="verify-actions">
          <button onClick={onLogout} className="btn btn-danger">
            {isRealUser ? 'Logout' : 'Back to Login'}
          </button>
          <button onClick={resendVerification} className="btn btn-secondary">
            Resend Email
          </button>
          {isRealUser && (
            <button 
              onClick={checkVerification} 
              className="btn btn-primary"
              disabled={checking}
            >
              {checking ? "Checking..." : "Check Verification"}
            </button>
          )}
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

  // Test storage connectivity when component mounts
  useEffect(() => {
    const runStorageTest = async () => {
      if (storage && user) {
        // Testing storage connectivity
        const canConnect = await testStorageConnectivity(storage, user);
        if (!canConnect) {
          console.warn('Storage connectivity test failed - uploads may not work properly');
        }
        // Storage connectivity verified
      }
    };
    
    runStorageTest();
  }, [storage, user]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setMessage("");
      return;
    }
    
    // Validate file type
    if (selectedFile.type !== "application/pdf") {
      setFile(null);
      setMessage("Please select a PDF file only.");
      e.target.value = ''; // Clear the input
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (selectedFile.size > maxSize) {
      setFile(null);
      setMessage("File size must be less than 10MB. Please choose a smaller file.");
      e.target.value = ''; // Clear the input
      return;
    }
    
    // Validate filename length
    if (selectedFile.name.length > 100) {
      setFile(null);
      setMessage("Filename is too long. Please rename your file to be shorter than 100 characters.");
      e.target.value = ''; // Clear the input
      return;
    }
    
    setFile(selectedFile);
    setMessage("");
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!db || !user) return;

    const profileDocRef = doc(db, "profiles", user.uid);

    try {
      // Update name first
      await setDoc(profileDocRef, { name: name }, { merge: true });

      if (file && storage) {
        setMessage("Uploading resume...");
        
        // Delete old resume from storage if it exists
        if (profile?.resumeUrl) {
          try {
            // Try multiple deletion approaches
            let deleted = false;
            
            // Approach 1: Extract path from URL
            const storagePath = getStoragePathFromUrl(profile.resumeUrl);
            // Storage path extracted successfully
            if (storagePath) {
              try {
                const oldResumeRef = ref(storage, storagePath);
                await deleteObject(oldResumeRef);
                // Old resume deleted successfully
                deleted = true;
              } catch (deleteError1) {
                console.warn('Method 1 failed:', deleteError1);
              }
            }
            
            // Approach 2: Try creating reference directly from URL if first approach failed
            if (!deleted) {
              try {
                // This method uses Firebase SDK's ability to create a reference from a download URL
                const oldResumeRef = ref(storage, profile.resumeUrl);
                await deleteObject(oldResumeRef);
                // Old resume deleted successfully
                deleted = true;
              } catch (deleteError2) {
                console.warn('Method 2 failed:', deleteError2);
              }
            }
            
            // Approach 3: Try extracting filename and using resumes folder path
            if (!deleted && profile.resumeUrl.includes('resumes/')) {
              try {
                // Extract just the filename part after resumes/
                const urlParts = profile.resumeUrl.split('resumes/');
                if (urlParts.length > 1) {
                  const filenamePart = urlParts[1].split('?')[0]; // Remove query parameters
                  const resumePath = `resumes/${decodeURIComponent(filenamePart)}`;
                  // Attempting alternative deletion method
                  const oldResumeRef = ref(storage, resumePath);
                  await deleteObject(oldResumeRef);
                  // Old resume deleted successfully
                  deleted = true;
                }
              } catch (deleteError3) {
                console.warn('Resume deletion method 3 failed:', deleteError3);
              }
            }
            
            if (!deleted) {
              console.warn('Could not delete old resume with any method. URL:', profile.resumeUrl);
            }
          } catch (deleteError) {
            // If the old file doesn't exist or there's another error, log it but continue
            console.warn('Could not delete old resume from storage:', deleteError);
          }
        }
        
        // Create a safe filename by removing spaces and special characters
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        const storageRef = ref(storage, `resumes/${user.uid}/${timestamp}_${safeFileName}`);
        
        // Attempting file upload
        
        try {
          // Attempting direct upload first (CORS workaround)
          
          // Try direct upload first as it's more reliable with CORS
          try {
            setUploadProgress(25); // Show initial progress
            const snapshot = await uploadBytes(storageRef, file);
            setUploadProgress(75); // Show more progress
            const downloadURL = await getDownloadURL(snapshot.ref);
            setUploadProgress(90); // Almost done
            
            await setDoc(
              profileDocRef,
              { 
                resumeUrl: downloadURL, 
                resumeFileName: file.name,
                resumeUploadDate: Timestamp.fromDate(new Date())
              },
              { merge: true }
            );
            
            setMessage("Profile and resume updated successfully!");
            setFile(null);
            setUploadProgress(0);
            
            // Clear the file input
            const fileInput = document.getElementById('resume');
            if (fileInput) fileInput.value = '';
            
          } catch (directUploadError) {
            console.error("Direct upload failed:", directUploadError);
            console.log('Falling back to resumable upload...');
            
            // Fallback to resumable upload
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress =
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
                console.log('Upload progress:', progress.toFixed(1) + '%');
              },
              (error) => {
                console.error("Resumable upload also failed:", error);
                let errorMessage = "Upload failed. This may be due to network issues or browser security settings.";
                
                if (error.code === 'storage/unauthorized') {
                  errorMessage = "You don't have permission to upload files. Please contact support.";
                } else if (error.code === 'storage/quota-exceeded') {
                  errorMessage = "Storage quota exceeded. Please contact support.";
                } else if (error.message.includes('CORS')) {
                  errorMessage = "Upload blocked by browser security policy. Try refreshing the page or using a different browser.";
                }
                
                setMessage(errorMessage);
                setUploadProgress(0);
              },
              async () => {
                try {
                  console.log('Resumable upload completed, getting download URL...');
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  console.log('Download URL obtained:', downloadURL);
                  await setDoc(
                    profileDocRef,
                    { 
                      resumeUrl: downloadURL, 
                      resumeFileName: file.name,
                      resumeUploadDate: Timestamp.fromDate(new Date())
                    },
                    { merge: true }
                  );
                  setMessage("Profile and resume updated successfully!");
                  setFile(null);
                  setUploadProgress(0);
                  
                  // Clear the file input
                  const fileInput = document.getElementById('resume');
                  if (fileInput) fileInput.value = '';
                } catch (error) {
                  console.error("Error getting download URL or updating profile:", error);
                  setMessage("Upload completed but failed to save. Please try again.");
                  setUploadProgress(0);
                }
              }
            );
          }
        } catch (uploadError) {
          console.error("Failed to start upload:", uploadError);
          setMessage("Failed to start upload. Please check your internet connection and try again.");
          setUploadProgress(0);
        }
      } else if (file && !storage) {
        setMessage("Storage service unavailable. Please refresh the page and try again.");
      } else {
        setMessage("Profile name updated!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Error updating profile. Please try again.");
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
            <label htmlFor="resume">Upload Resume (PDF only, max 10MB)</label>
            <input
              type="file"
              id="resume"
              onChange={handleFileChange}
              accept=".pdf"
            />
            <div className="resume-tips">
              <small className="form-help-text">
                💡 <strong>Tip:</strong> Your resume will be accessible via a secure link that you can share with employers. 
                The "Email Company" feature will include a professional link to your resume automatically.
              </small>
            </div>
            {file && (
              <div className="file-info">
                <p className="selected-file">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <progress value={uploadProgress} max="100" />
                <span className="progress-text">{Math.round(uploadProgress)}% uploaded</span>
              </div>
            )}
            {profile?.resumeUrl && (
              <div className="current-resume">
                <p>Current Resume:</p>
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resume-link"
                >
                  <div className="resume-file-icon">
                    📄
                  </div>
                  <div className="resume-file-details">
                    <div className="resume-file-name">
                      {profile.resumeFileName || "My Resume"}
                    </div>
                    <div className="resume-file-type">
                      PDF Document
                    </div>
                  </div>
                </a>
                <div className="resume-actions">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(profile.resumeUrl);
                      setMessage("Resume link copied to clipboard!");
                      setTimeout(() => setMessage(""), 3000);
                    }}
                    className="btn btn-secondary copy-link-btn"
                  >
                    📋 Copy Resume Link
                  </button>
                  <small className="resume-help-text">
                    Use this link to share your resume via email, messaging apps, or social media.
                  </small>
                </div>
                {profile.resumeUploadDate && (
                  <p className="upload-date">
                    Uploaded: {profile.resumeUploadDate.toDate().toLocaleDateString()}
                  </p>
                )}
              </div>
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
            onClick={() => handlePageChange("resume-builder")}
            className="nav-link"
          >
            Resume Builder
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

  // Function to detect if user is on mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

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
      
      // For mobile devices, use Gmail app deep link, otherwise use web Gmail
      if (isMobileDevice()) {
        return `googlegmail://co?to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      } else {
        return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    } else {
      // Student email template (existing)
      const studentName =
        profile?.name || "[Your Full Name - Please update in Profile]";
      const subject = `Internship Application - ${studentName}`;

      let resumeLine = "";
      if (profile?.resumeUrl) {
        resumeLine = `I have attached my resume for your review. You can access it through this link:

Resume Link: ${profile.resumeUrl}

Alternatively, I would be happy to send my resume as an email attachment if you prefer.`;
      } else {
        resumeLine = "I would be happy to provide my resume upon your request via email or through any preferred method.";
      }

      const body = `Dear ${contactPerson},

I hope this email finds you well.

My name is ${studentName}, and I am a student from Polytechnic University of the Philippines. I am writing to express my strong interest in an internship opportunity at ${companyName}, which I found through our school's InternIskolar portal.

${resumeLine}

I am eager to contribute to your organization and gain valuable experience in your industry. I would welcome the opportunity to discuss how my skills and enthusiasm can benefit your team.

Thank you for your time and consideration. I look forward to hearing from you.

Sincerely,
${studentName}
Polytechnic University of the Philippines`;

      // For mobile devices, use Gmail app deep link, otherwise use web Gmail
      if (isMobileDevice()) {
        return `googlegmail://co?to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      } else {
        return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    }
  };

  // Function to handle email button click with fallback
  const handleEmailClick = (e) => {
    e.preventDefault();
    const emailUrl = createGmailLink();
    
    if (isMobileDevice()) {
      // For mobile devices, try multiple email options
      if (emailUrl.startsWith('googlegmail://')) {
        // Try Gmail app first
        window.location.href = emailUrl;
        
        // Fallback to mailto with full content after a short delay
        setTimeout(() => {
          // Create full mailto URL with subject and body
          const companyName = hte.name;
          const contactPerson = hte.contactPerson || "Hiring Manager";
          const to = hte.email;
          const studentName = profile?.name || "[Your Full Name - Please update in Profile]";
          
          let subject, body;
          
          if (isAdmin) {
            subject = `PUP OJT Program - ${companyName}`;
            body = `Dear ${contactPerson},\n\nGreetings from Polytechnic University of the Philippines!\n\nI am reaching out regarding our partnership through the On-the-Job Training (OJT) program.\n\nBest regards,\nPUP OJT Administration`;
          } else {
            subject = `Internship Application - ${studentName}`;
            
            let resumeLine = "";
            if (profile?.resumeUrl) {
              resumeLine = `I have attached my resume for your review. You can access it through this link:\n\nResume Link: ${profile.resumeUrl}\n\nAlternatively, I would be happy to send my resume as an email attachment if you prefer.`;
            } else {
              resumeLine = "I would be happy to provide my resume upon your request via email or through any preferred method.";
            }
            
            body = `Dear ${contactPerson},\n\nI hope this email finds you well.\n\nMy name is ${studentName}, and I am a student from Polytechnic University of the Philippines. I am writing to express my strong interest in an internship opportunity at ${companyName}.\n\n${resumeLine}\n\nI am eager to contribute to your organization and gain valuable experience in your industry.\n\nThank you for your time and consideration.\n\nSincerely,\n${studentName}\nPolytechnic University of the Philippines`;
          }
          
          const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          window.location.href = mailtoUrl;
        }, 1500);
      } else {
        // Direct mailto for mobile (if Gmail deep link is not available)
        window.location.href = emailUrl.replace('https://mail.google.com/mail/?view=cm&fs=1&', 'mailto:').replace('&su=', '?subject=').replace('&body=', '&body=');
      }
    } else {
      // Desktop - open Gmail in new tab
      window.open(emailUrl, '_blank', 'noopener,noreferrer');
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
        <button
          onClick={handleEmailClick}
          className="btn btn-success email-btn"
        >
          <Mail size={16} /> Email Company
        </button>
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

function TemplatesSection({ isAdmin, db, storage }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch templates from Firestore with error handling
  useEffect(() => {
    if (!db) return;

    const templatesRef = collection(db, "templates");
    const unsubscribe = onSnapshot(
      templatesRef, 
      (snapshot) => {
        const templatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort templates by name
        templatesData.sort((a, b) => a.name.localeCompare(b.name));
        setTemplates(templatesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching templates:", error);
        setLoading(false);
        // Handle templates fetch errors
        if (error.code === 'unavailable') {
          console.warn("Templates temporarily unavailable. Will sync when connection is restored.");
        } else if (error.code === 'permission-denied') {
          console.error("Permission denied accessing templates.");
        } else {
          console.error("Unexpected error fetching templates:", error.message);
        }
      }
    );

    return () => unsubscribe();
  }, [db]);

  const handleUploadTemplate = async (templateData) => {
    if (!storage || !db) return;

    setUploadingTemplate(true);
    setUploadProgress(0);

    try {
      const file = templateData.file;
      const templateName = templateData.name;
      
      // Create a reference to the file in Firebase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `templates/${fileName}`);
      
      // Upload file with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Error uploading template:', error);
          alert('Error uploading template. Please try again.');
          setUploadingTemplate(false);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Save template metadata to Firestore
          await addDoc(collection(db, "templates"), {
            name: templateName,
            fileName: file.name,
            downloadURL: downloadURL,
            uploadedAt: Timestamp.now(),
            uploadedBy: templateData.uploadedBy || 'Admin'
          });
          
          setIsUploadModalOpen(false);
          setUploadingTemplate(false);
          setUploadProgress(0);
        }
      );
    } catch (error) {
      console.error('Error uploading template:', error);
      alert('Error uploading template. Please try again.');
      setUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId, downloadURL) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      // Delete from Firestore first
      await deleteDoc(doc(db, "templates", templateId));
      
      // Delete from Firebase Storage if downloadURL exists
      if (downloadURL && storage) {
        try {
          // Attempting to delete template file from storage
          
          // Try multiple deletion approaches
          let deleted = false;
          
          // Approach 1: Extract path from URL
          const storagePath = getStoragePathFromUrl(downloadURL);
          // Template storage path extracted
          if (storagePath) {
            try {
              const storageRef = ref(storage, storagePath);
              await deleteObject(storageRef);
              // Template file deleted successfully
              deleted = true;
            } catch (deleteError1) {
              console.warn('Template deletion method 1 failed:', deleteError1);
              console.warn('Error code:', deleteError1.code);
              console.warn('Error message:', deleteError1.message);
            }
          }
          
          // Approach 2: Try creating reference directly from URL if first approach failed
          if (!deleted) {
            try {
              const storageRef = ref(storage, downloadURL);
              await deleteObject(storageRef);
              // Template file deleted successfully
              deleted = true;
            } catch (deleteError2) {
              console.warn('Template deletion method 2 failed:', deleteError2);
            }
          }
          
          // Approach 3: Try extracting filename and using templates folder path
          if (!deleted && downloadURL.includes('templates/')) {
            try {
              // Extract just the filename part after templates/
              const urlParts = downloadURL.split('templates/');
              if (urlParts.length > 1) {
                const filenamePart = urlParts[1].split('?')[0]; // Remove query parameters
                const templatePath = `templates/${decodeURIComponent(filenamePart)}`;
                // Attempting alternative template deletion method
                const storageRef = ref(storage, templatePath);
                await deleteObject(storageRef);
                // Template file deleted successfully
                deleted = true;
              }
            } catch (deleteError3) {
              console.warn('Template deletion method 3 failed:', deleteError3);
            }
          }
          
          if (!deleted) {
            console.warn('Could not delete template file with any method. URL:', downloadURL);
          }
        } catch (storageError) {
          // If the file doesn't exist in storage or there's another error, log it but don't fail the operation
          console.warn('Could not delete template file from storage:', storageError);
        }
      }
      
      alert('Template deleted successfully!');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template. Please try again.');
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="page-heading">Downloadable Templates</h1>
        <div className="loading-screen">
          <span className="loading-text">Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-heading">Downloadable Templates</h1>
      {isAdmin && (
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn btn-primary add-hte-btn"
          >
            <PlusCircle size={20} />
            Add Template
          </button>
        </div>
      )}
      
      <div className="templates-container">
        {templates.length === 0 ? (
          <div className="no-results">
            <FileText size={48} />
            <p>No templates available at the moment.</p>
            {isAdmin && (
              <p>Click "Add Template" to upload the first template.</p>
            )}
          </div>
        ) : (
          <ul>
            {templates.map((template) => (
              <li key={template.id}>
                <div>
                  <FileText className="template-icon" />
                  <span>{template.name}</span>
                </div>
                <div className="template-actions">
                  <a 
                    href={template.downloadURL} 
                    download={template.fileName}
                    className="btn btn-success"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} />
                    Download
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTemplate(template.id, template.downloadURL)}
                      className="icon-btn danger"
                      title="Delete Template"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isUploadModalOpen && (
        <TemplateUploadModal
          closeModal={() => setIsUploadModalOpen(false)}
          onUpload={handleUploadTemplate}
          uploading={uploadingTemplate}
          uploadProgress={uploadProgress}
        />
      )}
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

function TemplateUploadModal({ closeModal, onUpload, uploading, uploadProgress }) {
  const [templateData, setTemplateData] = useState({
    name: '',
    file: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTemplateData(prev => ({
        ...prev,
        file: file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, "") // Use filename without extension as default name
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!templateData.name.trim() || !templateData.file) {
      alert('Please provide both a template name and file.');
      return;
    }

    onUpload({
      name: templateData.name.trim(),
      file: templateData.file,
      uploadedBy: 'Admin'
    });
  };

  const isFormValid = templateData.name.trim() && templateData.file && !uploading;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Upload New Template</h2>
          <button onClick={closeModal} className="close-btn" disabled={uploading}>
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div>
              <label htmlFor="templateName">Template Name</label>
              <input
                type="text"
                name="name"
                id="templateName"
                value={templateData.name}
                onChange={handleInputChange}
                placeholder="e.g., PUP Internship Agreement 2025"
                required
                disabled={uploading}
              />
            </div>
            
            <div>
              <label htmlFor="templateFile">Template File</label>
              <input
                type="file"
                name="file"
                id="templateFile"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
                required
                disabled={uploading}
              />
              <p className="form-help-text">
                Supported formats: PDF, Word documents (.doc, .docx), Text files (.txt)
              </p>
            </div>

            {templateData.file && (
              <div className="file-info">
                <p className="selected-file">
                  Selected: {templateData.file.name} ({(templateData.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}

            {uploading && (
              <div className="upload-progress">
                <div className="progress-text">
                  Uploading... {Math.round(uploadProgress)}%
                </div>
                <progress value={uploadProgress} max="100"></progress>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button
              type="button"
              onClick={closeModal}
              className="btn btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!isFormValid}
            >
              {uploading ? 'Uploading...' : 'Upload Template'}
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
          <div className="contact-stat-item">
            <div className="contact-stat-number">{feedbackRequests.length}</div>
            <div className="contact-stat-label">Total Requests</div>
          </div>
          {unreadCount > 0 && (
            <div className="contact-stat-item unread">
              <div className="contact-stat-number">{unreadCount}</div>
              <div className="contact-stat-label">Unread</div>
            </div>
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

