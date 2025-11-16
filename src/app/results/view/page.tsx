'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { Award, ChevronDown, ChevronUp, Download, Eye, Calendar, User, BookOpen, TrendingUp, CheckCircle, AlertCircle, ArrowLeft, Printer, Search, Trophy } from 'lucide-react';

interface ExamResult {
  id: string;
  studentName: string;
  studentId: string;
  class: string;
  examName: string;
  examType: string;
  examDate: string;
  subjects: {
    subject: string;
    subjectCode?: string;
    obtainedMarks: number;
    totalMarks: number;
    grade: string;
    gpa: number;
  }[];
  totalObtainedMarks: number;
  totalMarks: number;
  overallGPA: number;
  overallGrade: string;
  position: number;
  status: 'pass' | 'fail';
  remarks: string;
}

interface StudentInfo {
  name: string;
  class: string;
  studentId: string;
  rollNumber?: string;
  registrationNumber?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  board?: string;
  group?: string;
}

const ResultsViewPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolAddress, setSchoolAddress] = useState<string>('');
  const [establishmentYear, setEstablishmentYear] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load results from sessionStorage
        const storedResults = sessionStorage.getItem('examResults');
        const storedStudentInfo = sessionStorage.getItem('studentInfo');

        let parsedStudentInfo: StudentInfo | null = null;

        if (storedResults) {
          try {
            const parsedResults = JSON.parse(storedResults);
            console.log('📥 Loaded results from sessionStorage:', parsedResults.map((r: any) => ({ 
              position: r.position, 
              examId: r.examId,
              studentName: r.studentName,
              totalMarks: r.totalObtainedMarks
            })));
            setResults(parsedResults);
          } catch (e) {
            console.error('Error parsing results:', e);
          }
        }

        if (storedStudentInfo) {
          try {
            parsedStudentInfo = JSON.parse(storedStudentInfo);
            setStudentInfo(parsedStudentInfo);
          } catch (e) {
            console.error('Error parsing student info:', e);
          }
        }

        // Fetch student data from database using roll/regNo from URL params
        const rollParam = searchParams.get('roll');
        const regNoParam = searchParams.get('regNo');
        
        // Always try to fetch from database to ensure we have complete data
        if (rollParam || regNoParam) {
          try {
            const { studentQueries } = await import('@/lib/database-queries');
            const allStudents = await studentQueries.getAllStudents(false);
            
            let foundStudent: any = null;
            
            if (regNoParam && regNoParam.trim()) {
              foundStudent = allStudents.find(s => 
                (s as any).registrationNumber?.toLowerCase() === regNoParam.trim().toLowerCase() ||
                (s as any).registrationNumber === regNoParam.trim()
              );
            }
            
            if (!foundStudent && rollParam && rollParam.trim()) {
              foundStudent = allStudents.find(s => 
                s.rollNumber?.toLowerCase() === rollParam.trim().toLowerCase() ||
                s.rollNumber === rollParam.trim() ||
                s.studentId?.toLowerCase() === rollParam.trim().toLowerCase() ||
                s.studentId === rollParam.trim()
              );
            }
            
            if (foundStudent) {
              // Get dateOfBirth from multiple possible field names
              const dateOfBirth = (foundStudent as any).dateOfBirth || 
                                 (foundStudent as any).dob || 
                                 (foundStudent as any).date_of_birth ||
                                 (foundStudent as any).birthDate ||
                                 parsedStudentInfo?.dateOfBirth || 
                                 '';
              
              console.log('📅 Student dateOfBirth found:', {
                dateOfBirth: dateOfBirth,
                foundStudentKeys: Object.keys(foundStudent),
                hasDateOfBirth: !!(foundStudent as any).dateOfBirth,
                hasDob: !!(foundStudent as any).dob,
                hasDate_of_birth: !!(foundStudent as any).date_of_birth,
                hasBirthDate: !!(foundStudent as any).birthDate
              });
              
              // Merge with existing studentInfo from sessionStorage, prioritizing database data
              setStudentInfo({
                name: foundStudent.name || foundStudent.displayName || parsedStudentInfo?.name || '',
                class: foundStudent.class || parsedStudentInfo?.class || '',
                studentId: foundStudent.studentId || parsedStudentInfo?.studentId || '',
                rollNumber: foundStudent.rollNumber || foundStudent.studentId || parsedStudentInfo?.rollNumber || rollParam || '',
                registrationNumber: (foundStudent as any).registrationNumber || parsedStudentInfo?.registrationNumber || regNoParam || '',
                fatherName: foundStudent.fatherName || parsedStudentInfo?.fatherName || '',
                motherName: foundStudent.motherName || parsedStudentInfo?.motherName || '',
                dateOfBirth: dateOfBirth,
                board: searchParams.get('board') || parsedStudentInfo?.board || '',
                group: (foundStudent as any).group || parsedStudentInfo?.group || ''
              });
            } else if (!parsedStudentInfo) {
              // If no student found and no sessionStorage data, keep loading state
              console.warn('Student not found in database for roll:', rollParam, 'regNo:', regNoParam);
            }
          } catch (error) {
            console.error('Error loading student data from database:', error);
          }
        }

        // Fetch school information from settings
        try {
          const { settingsQueries } = await import('@/lib/database-queries');
          const settings = await settingsQueries.getSettings();
          if (settings?.schoolName) {
            setSchoolName(settings.schoolName);
          }
          // Use schoolLogo (for file export) from settings, fallback to websiteLogo
          if ((settings as any)?.schoolLogo) {
            setSchoolLogo((settings as any).schoolLogo);
          } else if ((settings as any)?.websiteLogo) {
            setSchoolLogo((settings as any).websiteLogo);
          }
          // Get school address directly from settings
          if (settings?.schoolAddress) {
            setSchoolAddress(settings.schoolAddress);
          }
          // Get establishment year directly from settings field
          if ((settings as any)?.establishmentYear) {
            setEstablishmentYear((settings as any).establishmentYear);
          } else {
            // Fallback: Try to extract from school description or name if not set
            const description = settings?.schoolDescription || '';
            const name = settings?.schoolName || '';
            const combined = `${description} ${name}`;
            const fullYearMatch = combined.match(/(\d{4})/);
            const bengaliYearMatch = combined.match(/(২০১[০-৯]|২০২[০-৯]|২০৩[০-৯])/);
            if (fullYearMatch) {
              // Convert English year to Bengali
              const year = fullYearMatch[1];
              const bengaliYear = year.replace(/\d/g, (d) => {
                const bengaliNums: { [key: string]: string } = {
                  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
                  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
                };
                return bengaliNums[d] || d;
              });
              setEstablishmentYear(bengaliYear);
            } else if (bengaliYearMatch) {
              setEstablishmentYear(bengaliYearMatch[1]);
            }
          }
        } catch (error) {
          console.warn('Error loading school info from settings:', error);
        }

        // Clear sessionStorage after loading
        try {
          sessionStorage.removeItem('examResults');
          sessionStorage.removeItem('studentInfo');
        } catch (error) {
          console.warn('Error clearing sessionStorage:', error);
        }

      } catch (error) {
        console.error('Error in loadData:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData().catch((error) => {
      console.error('Unhandled error in loadData:', error);
      setLoading(false);
    });
  }, [searchParams]);

  const handleGoBack = () => {
    router.push('/results');
  };

  const getStatusColor = (status: string) => {
    try {
      if (!status) return 'text-gray-600 bg-gray-100';
      switch (status) {
        case 'pass': return 'text-green-600 bg-green-100';
        case 'fail': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    } catch (error) {
      console.error('Error in getStatusColor:', error);
      return 'text-gray-600 bg-gray-100';
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.includes('A+')) return 'text-green-600 bg-green-100';
    if (grade.includes('A')) return 'text-blue-600 bg-blue-100';
    if (grade.includes('B+')) return 'text-yellow-600 bg-yellow-100';
    if (grade.includes('B')) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date formatting error';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  // Helper function to render Bengali text as image
  const renderBengaliTextAsImage = async (text: string, fontSize: number, fontWeight: string = 'normal', width: number = 180): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Set canvas size
    canvas.width = width * 4; // High DPI for clarity
    canvas.height = fontSize * 4;
    
    // Set font
    ctx.font = `${fontWeight} ${fontSize * 4}px 'Noto Serif Bengali', 'SolaimanLipi', 'Kalpurush', 'Hind Siliguri', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, 0, 0);

    return canvas.toDataURL('image/png');
  };

  const handleDirectPDFDownload = async () => {
    try {
      // Dynamically import libraries
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
      // Show loading state
      const downloadButton = document.querySelector('[data-download-btn]') as HTMLElement;
      const buttonText = downloadButton?.querySelector('span:last-child');
      if (downloadButton && buttonText) {
        const originalText = buttonText.textContent;
        (downloadButton as any).dataset.originalText = originalText;
        buttonText.textContent = 'ডাউনলোড হচ্ছে...';
        downloadButton.setAttribute('disabled', 'true');
        downloadButton.classList.add('opacity-50', 'cursor-not-allowed');
      }

      // Find the results container
      const resultsContainer = document.querySelector('.results-container') as HTMLElement;
      if (!resultsContainer) {
        alert('ফলাফল খুঁজে পাওয়া যায়নি।');
        return;
      }

      // Store original styles to restore later
      const originalStyles = {
        maxHeight: resultsContainer.style.maxHeight,
        overflow: resultsContainer.style.overflow,
        height: resultsContainer.style.height,
        position: resultsContainer.style.position,
      };

      // Remove any height/overflow constraints that might prevent full capture
      resultsContainer.style.maxHeight = 'none';
      resultsContainer.style.overflow = 'visible';
      resultsContainer.style.height = 'auto';
      resultsContainer.style.position = 'relative';

      // Also check and fix parent elements
      let parentElement = resultsContainer.parentElement;
      while (parentElement && parentElement !== document.body) {
        const parentStyles = window.getComputedStyle(parentElement);
        if (parentStyles.overflow === 'hidden' || parentStyles.overflowY === 'hidden') {
          (parentElement as HTMLElement).style.overflow = 'visible';
          (parentElement as HTMLElement).style.overflowY = 'visible';
        }
        parentElement = parentElement.parentElement;
      }

      // Scroll to top to ensure we capture from the beginning
      window.scrollTo(0, 0);
      resultsContainer.scrollIntoView({ behavior: 'auto', block: 'start' });

      // Force a layout recalculation to ensure all content is measured
      void resultsContainer.offsetHeight;
      
      // Wait a bit for scroll and layout to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Hide action buttons and navigation
      const actionButtons = document.querySelector('.action-buttons') as HTMLElement;
      const navigation = document.querySelector('nav') as HTMLElement;
      const originalDisplayButtons = actionButtons?.style.display;
      const originalDisplayNav = navigation?.style.display;
      if (actionButtons) actionButtons.style.display = 'none';
      if (navigation) navigation.style.display = 'none';

      // Pre-load all Bengali fonts before capturing
      const fontUrls = [
        'https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700&display=swap',
        'https://fonts.googleapis.com/css2?family=SolaimanLipi&display=swap',
        'https://fonts.googleapis.com/css2?family=Kalpurush&display=swap',
        'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap'
      ];

      // Load fonts in parallel
      await Promise.all(fontUrls.map(url => {
        return new Promise<void>((resolve) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          link.onload = () => resolve();
          link.onerror = () => resolve(); // Continue even if font fails
          document.head.appendChild(link);
        });
      }));

      // Ensure fonts are loaded
      await document.fonts.ready;
      
      // Pre-load fonts by creating text elements with Bengali characters
      const fontTestText = 'আমি বাংলায় গান গাই বাংলা আমার মাতৃভাষা';
      const testContainers: HTMLElement[] = [];
      
      ['Noto Serif Bengali', 'SolaimanLipi', 'Kalpurush', 'Hind Siliguri'].forEach(fontFamily => {
        const measureEl = document.createElement('span');
        measureEl.style.fontFamily = `'${fontFamily}', sans-serif`;
        measureEl.style.position = 'absolute';
        measureEl.style.visibility = 'hidden';
        measureEl.style.fontSize = '16px';
        measureEl.style.top = '-9999px';
        measureEl.textContent = fontTestText;
        document.body.appendChild(measureEl);
        testContainers.push(measureEl);
        
        // Force layout calculation multiple times
        void measureEl.offsetWidth;
        void measureEl.offsetHeight;
      });

      // Wait for fonts to be fully loaded and rendered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clean up test elements
      testContainers.forEach(el => {
        try {
          document.body.removeChild(el);
        } catch (e) {
          // Ignore if already removed
        }
      });

      // Pre-process: Convert all computed styles with lab() to rgb before html2canvas
      const convertLabToRgb = (element: HTMLElement) => {
        try {
          const computedStyle = window.getComputedStyle(element);
          const styleProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
          
          styleProps.forEach(prop => {
            const value = computedStyle.getPropertyValue(prop);
            if (value && value.includes('lab(')) {
              // Get the element's classes to determine appropriate RGB color
              const classes = element.className?.toString() || '';
              let rgbValue = '';
              
              if (prop === 'backgroundColor' || prop.includes('border')) {
                if (classes.includes('bg-gray-50') || classes.includes('bg-gray-100')) rgbValue = 'rgb(249, 250, 251)';
                else if (classes.includes('bg-gray-700')) rgbValue = 'rgb(55, 65, 81)';
                else if (classes.includes('bg-white')) rgbValue = 'rgb(255, 255, 255)';
                else if (classes.includes('bg-green-100')) rgbValue = 'rgb(220, 252, 231)';
                else if (classes.includes('bg-green-600')) rgbValue = 'rgb(22, 163, 74)';
                else if (classes.includes('bg-purple-600')) rgbValue = 'rgb(147, 51, 234)';
                else rgbValue = 'rgb(255, 255, 255)';
              } else if (prop === 'color') {
                if (classes.includes('text-white')) rgbValue = 'rgb(255, 255, 255)';
                else if (classes.includes('text-gray-900')) rgbValue = 'rgb(17, 24, 39)';
                else if (classes.includes('text-gray-600')) rgbValue = 'rgb(75, 85, 99)';
                else if (classes.includes('text-gray-700')) rgbValue = 'rgb(55, 65, 81)';
                else if (classes.includes('text-green-600')) rgbValue = 'rgb(22, 163, 74)';
                else if (classes.includes('text-green-700')) rgbValue = 'rgb(21, 128, 61)';
                else if (classes.includes('text-red-600')) rgbValue = 'rgb(220, 38, 38)';
                else if (classes.includes('text-red-700')) rgbValue = 'rgb(185, 28, 28)';
                else rgbValue = 'rgb(0, 0, 0)';
              }
              
              if (rgbValue) {
                element.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), rgbValue, 'important');
              }
            }
          });
        } catch (e) {
          // Ignore errors
        }
      };

      // Pre-process all elements in results container
      const allElements = resultsContainer.querySelectorAll('*') as NodeListOf<HTMLElement>;
      allElements.forEach(convertLabToRgb);
      convertLabToRgb(resultsContainer);

      // Calculate actual content dimensions
      // Force all content to be visible first
      const allChildren = resultsContainer.querySelectorAll('*');
      allChildren.forEach((el) => {
        const element = el as HTMLElement;
        if (element.style) {
          const display = window.getComputedStyle(element).display;
          if (display === 'none') {
            element.style.display = 'block';
          }
        }
      });

      // Get the actual dimensions - use scrollHeight to get full content height
      const actualWidth = Math.max(
        resultsContainer.scrollWidth,
        resultsContainer.offsetWidth,
        resultsContainer.clientWidth
      );
      const actualHeight = Math.max(
        resultsContainer.scrollHeight,
        resultsContainer.offsetHeight,
        resultsContainer.clientHeight
      );

      console.log('Container dimensions:', {
        scrollWidth: resultsContainer.scrollWidth,
        scrollHeight: resultsContainer.scrollHeight,
        offsetWidth: resultsContainer.offsetWidth,
        offsetHeight: resultsContainer.offsetHeight,
        actualWidth,
        actualHeight
      });

      // Convert to canvas with high quality and proper font handling
      const canvas = await html2canvas(resultsContainer, {
        scale: 2.5, // Higher scale for better quality
        useCORS: true,
        logging: true, // Enable logging to debug
        backgroundColor: '#ffffff',
        width: actualWidth,
        height: actualHeight,
        x: 0,
        y: 0,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        letterRendering: true,
        onclone: async (clonedDoc) => {
          // Inject Google Fonts CSS synchronously with font-display: block
          const fontLinks = [
            'https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700&display=block',
            'https://fonts.googleapis.com/css2?family=SolaimanLipi&display=block',
            'https://fonts.googleapis.com/css2?family=Kalpurush&display=block',
            'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=block'
          ];
          
          // Load fonts synchronously in cloned document
          for (const url of fontLinks) {
            const link = clonedDoc.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            clonedDoc.head.appendChild(link);
            
            // Wait for each font to load
            await new Promise<void>((resolve) => {
              link.onload = () => resolve();
              link.onerror = () => resolve();
              // Fallback timeout
              setTimeout(() => resolve(), 500);
            });
          }

          // Remove all stylesheets that might contain lab() colors (but keep font links)
          const stylesheets = Array.from(clonedDoc.styleSheets || []);
          stylesheets.forEach(sheet => {
            try {
              if (sheet.ownerNode && !fontLinks.some(url => (sheet.ownerNode as HTMLLinkElement)?.href?.includes(url))) {
                (sheet.ownerNode as HTMLElement).remove();
              }
            } catch (e) {
              // Ignore
            }
          });

          // Apply font styles and comprehensive RGB color overrides (no lab())
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              font-family: 'Noto Serif Bengali', 'SolaimanLipi', 'Kalpurush', 'Hind Siliguri', sans-serif !important;
              font-feature-settings: "liga" 1, "calt" 1 !important;
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              text-rendering: optimizeLegibility !important;
            }
            
            /* Comprehensive RGB color overrides - NO lab() colors */
            * {
              color: rgb(0, 0, 0) !important;
              background-color: rgb(255, 255, 255) !important;
              border-color: rgb(0, 0, 0) !important;
            }
            
            /* Background colors */
            .bg-gray-50, .bg-gray-100 { background-color: rgb(249, 250, 251) !important; }
            .bg-gray-700 { background-color: rgb(55, 65, 81) !important; }
            .bg-white { background-color: rgb(255, 255, 255) !important; }
            .bg-green-100 { background-color: rgb(220, 252, 231) !important; }
            .bg-green-600 { background-color: rgb(22, 163, 74) !important; }
            .bg-purple-600 { background-color: rgb(147, 51, 234) !important; }
            
            /* Text colors */
            .text-white { color: rgb(255, 255, 255) !important; }
            .text-gray-900 { color: rgb(17, 24, 39) !important; }
            .text-gray-600 { color: rgb(75, 85, 99) !important; }
            .text-gray-700 { color: rgb(55, 65, 81) !important; }
            .text-green-600 { color: rgb(22, 163, 74) !important; }
            .text-green-700 { color: rgb(21, 128, 61) !important; }
            .text-red-600 { color: rgb(220, 38, 38) !important; }
            .text-red-700 { color: rgb(185, 28, 28) !important; }
            
            /* Border colors */
            .border-gray-400 { border-color: rgb(156, 163, 175) !important; }
            .border-gray-500 { border-color: rgb(107, 114, 128) !important; }
            .border-2 { border-width: 2px !important; }
          `;
          clonedDoc.head.appendChild(style);

          // Force convert all computed styles in cloned document
          const clonedElements = clonedDoc.querySelectorAll('*') as NodeListOf<HTMLElement>;
          clonedElements.forEach((el) => {
            try {
              const computedStyle = (clonedDoc.defaultView || window).getComputedStyle(el);
              ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
                const value = computedStyle.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
                if (value && value.includes('lab(')) {
                  const classes = el.className?.toString() || '';
                  let rgbValue = '';
                  
                  if (prop === 'backgroundColor') {
                    if (classes.includes('bg-gray-50') || classes.includes('bg-gray-100')) rgbValue = 'rgb(249, 250, 251)';
                    else if (classes.includes('bg-gray-700')) rgbValue = 'rgb(55, 65, 81)';
                    else if (classes.includes('bg-white')) rgbValue = 'rgb(255, 255, 255)';
                    else rgbValue = 'rgb(255, 255, 255)';
                  } else if (prop === 'color') {
                    if (classes.includes('text-white')) rgbValue = 'rgb(255, 255, 255)';
                    else if (classes.includes('text-gray-900')) rgbValue = 'rgb(17, 24, 39)';
                    else if (classes.includes('text-gray-600')) rgbValue = 'rgb(75, 85, 99)';
                    else rgbValue = 'rgb(0, 0, 0)';
                  } else {
                    rgbValue = 'rgb(0, 0, 0)';
                  }
                  
                  if (rgbValue) {
                    el.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), rgbValue, 'important');
                  }
                }
              });
            } catch (e) {
              // Ignore errors
            }
          });

          // Force font loading in cloned document with Bengali text
          const fontTestText = 'আমি বাংলায় গান গাই';
          const clonedFontTests: HTMLElement[] = [];
          
          ['Noto Serif Bengali', 'SolaimanLipi', 'Kalpurush', 'Hind Siliguri'].forEach(fontFamily => {
            const testEl = clonedDoc.createElement('span');
            testEl.style.fontFamily = `'${fontFamily}', sans-serif`;
            testEl.style.position = 'absolute';
            testEl.style.visibility = 'hidden';
            testEl.style.fontSize = '16px';
            testEl.style.top = '-9999px';
            testEl.style.left = '-9999px';
            testEl.textContent = fontTestText;
            clonedDoc.body.appendChild(testEl);
            clonedFontTests.push(testEl);
            
            // Force layout calculation
            void testEl.offsetWidth;
            void testEl.offsetHeight;
          });

          // Force all text elements to use Bengali fonts
          const allTextElements = clonedDoc.querySelectorAll('*');
          allTextElements.forEach((el) => {
            const element = el as HTMLElement;
            if (element.textContent && element.textContent.trim().length > 0) {
              element.style.fontFamily = "'Noto Serif Bengali', 'SolaimanLipi', 'Kalpurush', 'Hind Siliguri', sans-serif";
            }
          });
          
          // Wait longer for fonts to fully load and render in cloned doc
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Clean up test elements
          clonedFontTests.forEach(el => {
            try {
              clonedDoc.body.removeChild(el);
            } catch (e) {
              // Ignore if already removed
            }
          });
        }
      }).catch(async (error: any) => {
        // If error occurs due to lab() colors, retry with simplified options
        console.warn('html2canvas error, retrying with minimal options:', error);
        
        // Try again with minimal processing
        return await html2canvas(resultsContainer, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          foreignObjectRendering: false,
          onclone: (clonedDoc) => {
            // Remove all stylesheets
            Array.from(clonedDoc.styleSheets || []).forEach(sheet => {
              try {
                if (sheet.ownerNode) {
                  (sheet.ownerNode as HTMLElement).remove();
                }
              } catch (e) {}
            });
            
            // Inject only RGB colors
            const style = clonedDoc.createElement('style');
            style.textContent = `
              * {
                color: rgb(0, 0, 0) !important;
                background-color: rgb(255, 255, 255) !important;
                border-color: rgb(0, 0, 0) !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          }
        });
      });

      // Restore original styles
      resultsContainer.style.maxHeight = originalStyles.maxHeight || '';
      resultsContainer.style.overflow = originalStyles.overflow || '';
      resultsContainer.style.height = originalStyles.height || '';
      resultsContainer.style.position = originalStyles.position || '';

      // Restore parent overflow styles if we changed them
      let parentElementRestore = resultsContainer.parentElement;
      while (parentElementRestore && parentElementRestore !== document.body) {
        (parentElementRestore as HTMLElement).style.overflow = '';
        (parentElementRestore as HTMLElement).style.overflowY = '';
        parentElementRestore = parentElementRestore.parentElement;
      }

      // Restore display
      if (actionButtons) actionButtons.style.display = originalDisplayButtons || '';
      if (navigation) navigation.style.display = originalDisplayNav || '';

      // Verify canvas dimensions
      console.log('Canvas dimensions:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        expectedWidth: actualWidth,
        expectedHeight: actualHeight,
        ratio: canvas.height / canvas.width
      });

      // Warn if canvas height is much less than expected
      if (canvas.height < actualHeight * 0.8) {
        console.warn('Canvas height is less than expected!', {
          canvasHeight: canvas.height,
          expectedHeight: actualHeight,
          difference: actualHeight - canvas.height
        });
      }

      // Create PDF
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const marginTop = 10;
      const marginBottom = 10;
      const marginLeft = 5;
      const marginRight = 5;
      const contentWidth = pageWidth - marginLeft - marginRight;
      const contentHeight = pageHeight - marginTop - marginBottom;
      
      // Calculate image dimensions to fit width
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log('PDF calculations:', {
        imgWidth,
        imgHeight,
        contentHeight,
        totalPages: Math.ceil(imgHeight / contentHeight)
      });

      // Convert canvas to image with maximum quality
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Calculate number of pages needed (add 1 to ensure we don't cut off)
      const totalPages = Math.ceil(imgHeight / contentHeight);

      // Add first page with image starting from top
      pdf.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight);

      // Add additional pages if content exceeds one page
      for (let i = 1; i < totalPages; i++) {
        pdf.addPage();
        // Position the image so the next portion shows on this page
        const yPosition = marginTop - (i * contentHeight);
        pdf.addImage(imgData, 'PNG', marginLeft, yPosition, imgWidth, imgHeight);
      }

      // Generate filename
      const examName = searchParams.get('examination') || results[0]?.examName || 'Result';
      const year = searchParams.get('year') || '';
      const rollNo = studentInfo?.rollNumber || studentInfo?.studentId || '';
      const filename = `${examName}_${year}_${rollNo}.pdf`.replace(/[^a-zA-Z0-9\u0980-\u09FF_]/g, '_');

      // Save PDF
      pdf.save(filename);

      // Restore button
      if (downloadButton) {
        const buttonText = downloadButton.querySelector('span:last-child');
        if (buttonText) {
          const originalText = (downloadButton as any).dataset.originalText || 'ডাউনলোড করুন';
          buttonText.textContent = originalText;
        }
        downloadButton.removeAttribute('disabled');
        downloadButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      const errorMessage = error?.message || 'PDF ডাউনলোডে সমস্যা হয়েছে।';
      alert(errorMessage + ' অনুগ্রহ করে আবার চেষ্টা করুন।');
      
      // Restore button
      const downloadButton = document.querySelector('[data-download-btn]') as HTMLElement;
      if (downloadButton) {
        const buttonText = downloadButton.querySelector('span:last-child');
        if (buttonText) {
          const originalText = (downloadButton as any).dataset.originalText || 'ডাউনলোড করুন';
          buttonText.textContent = originalText;
        }
        downloadButton.removeAttribute('disabled');
        downloadButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  };

  // Direct jsPDF text rendering with Bengali fonts
  const handleDirectTextPDFDownload = async () => {
    try {
      // Step 1: Ensure fonts are loaded first
      const { ensureFontsLoaded } = await import('@/lib/pdf-font-loader');
      await ensureFontsLoaded();
      console.log('✅ Fonts pre-loaded');
      
      // Step 2: Import jsPDF and font utilities
      const { default: jsPDF } = await import('jspdf');
      const { registerBengaliFonts, setBengaliFont } = await import('@/lib/pdf-bengali-fonts');

      const downloadButton = document.querySelector('[data-download-btn]') as HTMLElement;
      const buttonText = downloadButton?.querySelector('span:last-child');
      if (downloadButton && buttonText) {
        const originalText = buttonText.textContent;
        (downloadButton as any).dataset.originalText = originalText;
        buttonText.textContent = 'ডাউনলোড হচ্ছে...';
        downloadButton.setAttribute('disabled', 'true');
        downloadButton.classList.add('opacity-50', 'cursor-not-allowed');
      }

      if (results.length === 0 || !studentInfo) {
        alert('ফলাফল খুঁজে পাওয়া যায়নি।');
        return;
      }

      const result = results[0];
      
      // Step 3: Create PDF instance (this triggers events API)
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      
      // Step 4: Manually register fonts to ensure they're available
      // Events API might not have caught them if fonts were loading when jsPDF was imported
      console.log('Registering Bengali fonts...');
      let activeFont: string = 'NotoSerifBengali';
      let fontRegistered = false;
      
      try {
        const registeredFontName = await registerBengaliFonts(pdf, 'NotoSerifBengali');
        activeFont = registeredFontName; // Use the actual font name returned
        fontRegistered = true;
        console.log(`✅ Noto Serif Bengali registered successfully as: ${activeFont}`);
      } catch (e) {
        console.warn('Could not register Noto Serif Bengali, trying Sayam Rupali:', e);
        try {
          const registeredFontName = await registerBengaliFonts(pdf, 'SayamRupali');
          activeFont = registeredFontName; // Use the actual font name returned
          fontRegistered = true;
          console.log(`✅ Sayam Rupali registered successfully as: ${activeFont}`);
        } catch (e2) {
          console.error('Could not register any Bengali font:', e2);
          throw new Error('Font registration failed');
        }
      }
      
      // Step 5: Verify fonts are available and set the font
      const pageWidth = 210;
      const pageHeight = 297;
      const marginLeft = 10;
      const marginTop = 15;
      const marginRight = 10;
      const marginBottom = 15;
      let yPosition = marginTop;
      
      // Check available fonts for debugging
      const fontList = (pdf as any).getFontList();
      console.log('Available fonts:', fontList ? Object.keys(fontList) : []);
      
      // Set Bengali font using the name returned from registration
      console.log(`Setting font to: ${activeFont}`);
      try {
        setBengaliFont(pdf, activeFont);
        // Verify current font was set correctly
        const currentFont = pdf.getFont();
        console.log('Current font after setting:', currentFont);
        if (currentFont && currentFont.fontName) {
          // Update activeFont to the actual font name jsPDF is using
          activeFont = currentFont.fontName;
          console.log(`✅ Font successfully set to: ${activeFont}`);
        }
      } catch (fontError) {
        console.warn('Error setting font, will try to continue:', fontError);
        // Try to use the font anyway - jsPDF might still work
        try {
          pdf.setFont(activeFont as any);
          console.log(`✅ Font set directly to: ${activeFont}`);
        } catch (e) {
          console.error('Could not set font at all:', e);
          throw new Error('Font setup failed');
        }
      }
      
      // Test font with a small Bengali text to verify it's working
      try {
        pdf.setFontSize(10);
        setBengaliFont(pdf, activeFont);
        const testText = 'আমি';
        const testWidth = pdf.getTextWidth(testText);
        console.log(`✅ Font test: Bengali text "${testText}" width: ${testWidth}`);
        if (testWidth === 0 || isNaN(testWidth)) {
          console.warn('⚠️ Font test returned invalid width - font might not be working correctly');
          // Try to use the font anyway, but warn user
          console.warn('⚠️ Proceeding with font despite test failure - PDF may have rendering issues');
        } else {
          console.log(`✅ Font is working correctly (text width: ${testWidth})`);
        }
      } catch (testError) {
        console.warn('⚠️ Font test failed:', testError);
        // Continue anyway - the font might still work
      }

      // Reset font size for actual content
      pdf.setFontSize(14);
      
      // Ensure font is set before starting to add content
      setBengaliFont(pdf, activeFont);
      
      // Header - School Name (Centered)
      pdf.setFontSize(18);
      setBengaliFont(pdf, activeFont as any);
      const schoolNameText = schoolName || 'আমার স্কুল';
      const schoolNameWidth = pdf.getTextWidth(schoolNameText);
      pdf.text(schoolNameText, (pageWidth - schoolNameWidth) / 2, yPosition);
      yPosition += 8;

      // School Address
      if (schoolAddress) {
        pdf.setFontSize(12);
        setBengaliFont(pdf, activeFont as any);
        const addressWidth = pdf.getTextWidth(schoolAddress);
        pdf.text(schoolAddress, (pageWidth - addressWidth) / 2, yPosition);
        yPosition += 6;
      }

      // Exam Title
      pdf.setFontSize(16);
      setBengaliFont(pdf, activeFont as any);
      const examName = searchParams.get('examination') || result.examName || 'ফলাফল';
      const year = searchParams.get('year') || '';
      const examTitleText = `${examName} ${year}`.trim();
      const examTitleWidth = pdf.getTextWidth(examTitleText);
      pdf.text(examTitleText, (pageWidth - examTitleWidth) / 2, yPosition);
      yPosition += 10;

      // Student Information Section
      pdf.setFontSize(11);
      setBengaliFont(pdf, activeFont as any);
      
      // Left Column Info
      let infoX = marginLeft;
      pdf.text(`রোল নম্বর: ${studentInfo.rollNumber || studentInfo.studentId || 'নাই'}`, infoX, yPosition);
      yPosition += 6;
      pdf.text(`বোর্ড: ${studentInfo.board || searchParams.get('board') || 'নাই'}`, infoX, yPosition);
      yPosition += 6;
      if (studentInfo.group && studentInfo.group.trim() !== '') {
        pdf.text(`গ্রুপ: ${studentInfo.group}`, infoX, yPosition);
        yPosition += 6;
      }
      pdf.text(`ফলাফল: ${result.status === 'pass' ? 'পাস' : 'অকৃতকার্য'}`, infoX, yPosition);
      yPosition += 6;
      pdf.text(`জিপিএ: ${result.overallGPA.toFixed(2)}`, infoX, yPosition);
      
      // Right Column Info
      let rightX = pageWidth - marginRight - 60;
      let rightY = marginTop + 15;
      pdf.text(`নাম: ${studentInfo.name || result.studentName}`, rightX, rightY);
      rightY += 6;
      pdf.text(`ক্লাস: ${studentInfo.class || result.class}`, rightX, rightY);
      rightY += 6;
      if (studentInfo.fatherName) {
        pdf.text(`পিতার নাম: ${studentInfo.fatherName}`, rightX, rightY);
        rightY += 6;
      }
      if (studentInfo.motherName) {
        pdf.text(`মাতার নাম: ${studentInfo.motherName}`, rightX, rightY);
        rightY += 6;
      }
      
      // Reset Y position for table
      yPosition = Math.max(yPosition, rightY) + 8;

      // Subjects Table Header
      pdf.setFontSize(10);
      setBengaliFont(pdf, activeFont as any);
      
      const colWidths = [20, 50, 25, 25, 20];
      const colHeaders = ['কোড', 'বিষয়', 'মোট', 'প্রাপ্ত', 'গ্রেড'];
      let tableX = marginLeft;
      
      // Draw table headers
      colHeaders.forEach((header, idx) => {
        pdf.text(header, tableX, yPosition);
        tableX += colWidths[idx];
      });
      yPosition += 5;

      // Table rows
      setBengaliFont(pdf, activeFont as any);
      const sortedSubjects = [...result.subjects].sort((a, b) => {
        const codeA = parseInt(a.subjectCode || '0') || 0;
        const codeB = parseInt(b.subjectCode || '0') || 0;
        return codeA - codeB;
      });

      sortedSubjects.forEach((subject) => {
        // Check if new page needed
        if (yPosition > pageHeight - marginBottom - 10) {
          pdf.addPage();
          yPosition = marginTop;
        }

        tableX = marginLeft;
        pdf.text(subject.subjectCode || 'N/A', tableX, yPosition);
        tableX += colWidths[0];
        
        // Wrap long subject names
        const subjectName = subject.subject;
        const maxWidth = colWidths[1];
        const subjectLines = pdf.splitTextToSize(subjectName, maxWidth);
        pdf.text(subjectLines[0], tableX, yPosition);
        if (subjectLines.length > 1) {
          yPosition += 5;
        }
        
        tableX += colWidths[1];
        pdf.text(subject.totalMarks.toString(), tableX, yPosition);
        tableX += colWidths[2];
        pdf.text(subject.obtainedMarks.toString(), tableX, yPosition);
        tableX += colWidths[3];
        pdf.text(subject.grade || 'N/A', tableX, yPosition);
        
        yPosition += 6;
      });

      // Summary Section
      yPosition += 5;
      if (yPosition > pageHeight - marginBottom - 20) {
        pdf.addPage();
        yPosition = marginTop;
      }

      pdf.setFontSize(11);
      setBengaliFont(pdf, activeFont as any);
      pdf.text(`মোট নম্বর: ${result.totalMarks}`, marginLeft, yPosition);
      yPosition += 6;
      pdf.text(`প্রাপ্ত নম্বর: ${result.totalObtainedMarks}`, marginLeft, yPosition);
      yPosition += 6;
             pdf.text(`গ্রেড: ${result.overallGrade}`, marginLeft, yPosition);
       yPosition += 6;
       pdf.text(`অবস্থান: ${toBengaliNumerals(result.position || 0)}`, marginLeft, yPosition);

      // Generate filename
      const examNameForFile = searchParams.get('examination') || result.examName || 'Result';
      const yearForFile = searchParams.get('year') || '';
      const rollNo = studentInfo.rollNumber || studentInfo.studentId || '';
      const filename = `${examNameForFile}_${yearForFile}_${rollNo}.pdf`.replace(/[^a-zA-Z0-9\u0980-\u09FF_]/g, '_');

      // Save PDF
      pdf.save(filename);

      // Restore button
      if (downloadButton) {
        if (buttonText) {
          const originalText = (downloadButton as any).dataset.originalText || 'ডাউনলোড করুন';
          buttonText.textContent = originalText;
        }
        downloadButton.removeAttribute('disabled');
        downloadButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }

    } catch (error: any) {
      console.error('Error in direct text PDF download:', error);
      console.error('Error details:', error?.message || error);
      
      // Re-throw error so handleDownload can catch it and use html2canvas fallback
      throw error;
    }
  };

  // Export to PDF function - same logic as admin/students
  const exportToPDF = async () => {
    try {
      if (!results || results.length === 0 || !studentInfo) {
        alert('রেজাল্ট ডাটা পাওয়া যায়নি');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('পপআপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপআপ অনুমতি দিন।');
        return;
      }

      const currentDate = new Date().toLocaleDateString('bn-BD');
      const examName = searchParams.get('examination') || results[0]?.examName || 'পরীক্ষার রেজাল্ট';
      const examYear = searchParams.get('year') || '';
      
      // Format results for each exam
      const resultsHTML = results.map((result, index) => {
                  const subjectsRows = result.subjects
            .sort((a, b) => {
              const codeA = parseInt(a.subjectCode || '0') || 0;
              const codeB = parseInt(b.subjectCode || '0') || 0;
              return codeA - codeB;
            })
            .map((subject) => `
              <tr>
                <td>${subject.subjectCode ? toBengaliNumerals(parseInt(subject.subjectCode) || 0) : '-'}</td>
                <td>${subject.subject || '-'}</td>
                <td>${toBengaliNumerals(subject.totalMarks)}</td>
                <td>${toBengaliNumerals(subject.obtainedMarks)}</td>
                <td>${subject.grade || '-'}</td>
              </tr>
            `).join('');

        return `
          <div style="margin-bottom: 30px; page-break-after: ${index < results.length - 1 ? 'always' : 'auto'};">
                         <div class="exam-header">
               <div class="exam-title">${result.examName || examName} ${examYear ? `(${examYear})` : ''}</div>
             </div>

                          <div class="student-info-section">
                <div class="info-grid">
                  <div class="info-column-left">
                    <div class="info-row">
                      <div class="info-label">রোল নম্বর:</div>
                      <div class="info-value">${studentInfo.rollNumber || studentInfo.studentId || 'নাই'}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">বোর্ড:</div>
                      <div class="info-value">${studentInfo.board || searchParams.get('board') || 'নাই'}</div>
                    </div>
                    ${studentInfo.group && studentInfo.group.trim() !== '' ? `
                    <div class="info-row">
                      <div class="info-label">গ্রুপ:</div>
                      <div class="info-value">${studentInfo.group}</div>
                    </div>
                    ` : ''}
                    <div class="info-row">
                      <div class="info-label">ধরন:</div>
                      <div class="info-value">নিয়মিত</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">ফলাফল:</div>
                      <div class="info-value ${result.status === 'pass' ? 'status-pass' : 'status-fail'}">${result.status === 'pass' ? 'পাস' : 'অকৃতকার্য'}</div>
                    </div>
                                         <div class="info-row">
                       <div class="info-label">জিপিএ:</div>
                       <div class="info-value">${toBengaliNumerals(parseFloat(result.overallGPA.toFixed(2)))}</div>
                     </div>
                  </div>
                  <div class="info-column-right">
                    <div class="info-row">
                      <div class="info-label">নাম:</div>
                      <div class="info-value">${studentInfo.name || result.studentName || 'নাই'}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">পিতার নাম:</div>
                      <div class="info-value">${studentInfo.fatherName || 'নাই'}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">মাতার নাম:</div>
                      <div class="info-value">${studentInfo.motherName || 'নাই'}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">জন্ম তারিখ:</div>
                      <div class="info-value">${studentInfo.dateOfBirth ? formatDateOfBirth(studentInfo.dateOfBirth) : 'নাই'}</div>
                    </div>
                                         <div class="info-row">
                       <div class="info-label">প্রতিষ্ঠানের নাম:</div>
                       <div class="info-value">${schoolName || 'নাই'}</div>
                     </div>
                  </div>
                </div>
              </div>

                          <div class="subjects-section">
                <h3 class="grade-sheet-title">গ্রেড শীট</h3>
                <table class="subjects-table">
                  <thead>
                    <tr>
                      <th>কোড</th>
                      <th>বিষয়</th>
                      <th>মোট নম্বর</th>
                      <th>প্রাপ্ত নম্বর</th>
                      <th>গ্রেড</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subjectsRows}
                  </tbody>
                </table>
              </div>

                                                     <div class="summary-section">
                 <div class="summary-boxes">
                   <div class="summary-box">
                     <div class="summary-label">মোট নম্বর</div>
                     <div class="summary-value">${toBengaliNumerals(result.totalObtainedMarks)} / ${toBengaliNumerals(result.totalMarks)}</div>
                   </div>
                   <div class="summary-box">
                     <div class="summary-label">শতাংশ</div>
                     <div class="summary-value">${toBengaliNumerals(parseFloat(((result.totalObtainedMarks / result.totalMarks) * 100).toFixed(2)))}%</div>
                   </div>
                   <div class="summary-box">
                     <div class="summary-label">সামগ্রিক গ্রেড</div>
                     <div class="summary-value">${result.overallGrade || '-'}</div>
                   </div>
                                        <div class="summary-box">
                      <div class="summary-label">অবস্থান</div>
                      <div class="summary-value">${result.position && result.position > 0 ? toBengaliNumerals(result.position) : '-'}</div>
                    </div>
                 </div>
               </div>
          </div>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="bn" dir="ltr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>পরীক্ষার রেজাল্ট</title>
            <style>
                body {
                    font-family: 'Bangla', 'SolaimanLipi', Arial, sans-serif;
                    margin: 0;
                    padding: 10px 8px;
                    direction: ltr;
                    text-align: left;
                }
                                                                   .school-header {
                      margin-bottom: 15px;
                      padding: 8px;
                      border-bottom: 2px solid #2563eb;
                      position: relative;
                  }
                  .school-header-content {
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      position: relative;
                  }
                  .school-logo {
                      height: 80px;
                      width: auto;
                      max-width: 150px;
                      object-fit: contain;
                      flex-shrink: 0;
                  }
                  .school-header-text {
                      position: absolute;
                      left: 50%;
                      transform: translateX(-50%);
                      text-align: center;
                      width: 100%;
                  }
                  .school-name {
                      font-size: 26px;
                      font-weight: bold;
                      color: #2563eb;
                      margin-bottom: 6px;
                  }
                  .school-info {
                      font-size: 14px;
                      color: #333;
                      margin-bottom: 3px;
                  }
                  .school-establishment-year {
                      font-size: 14px;
                      color: #333;
                      margin-top: 3px;
                  }
                  .school-header-spacer {
                      width: 150px;
                      flex-shrink: 0;
                  }
                .exam-header {
                    text-align: center;
                    margin-bottom: 15px;
                    padding: 8px;
                }
                .exam-title {
                    font-size: 22px;
                    font-weight: bold;
                    color: #2563eb;
                    margin-bottom: 8px;
                }
                .exam-info {
                    font-size: 14px;
                    color: #333;
                }
                                  .student-info-section {
                      margin-bottom: 20px;
                  }
                  .info-grid {
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      gap: 0;
                      border: 2px solid #9ca3af;
                      margin-bottom: 15px;
                  }
                  .info-column-left,
                  .info-column-right {
                      background-color: #ffffff;
                  }
                  .info-column-left {
                      border-right: 2px solid #9ca3af;
                  }
                                     .info-row {
                       display: flex;
                       padding: 12px 16px;
                       border-bottom: 1px solid #e5e7eb;
                       white-space: normal;
                   }
                  .info-row:last-child {
                      border-bottom: none;
                  }
                  .info-label {
                      width: 144px;
                      font-weight: 600;
                      color: #374151;
                      font-size: 14px;
                  }
                                                                                                                 .info-value {
                        flex: 1;
                        color: #111827;
                        font-size: 14px;
                        white-space: nowrap;
                    }
                  .info-value.status-pass {
                      color: #15803d;
                      font-weight: bold;
                  }
                  .info-value.status-fail {
                      color: #dc2626;
                      font-weight: bold;
                  }
                                  .subjects-section {
                      margin-bottom: 20px;
                      padding: 24px;
                  }
                  .grade-sheet-title {
                      font-size: 20px;
                      font-weight: bold;
                      text-align: center;
                      color: #111827;
                      margin-bottom: 24px;
                  }
                                     .subjects-table {
                       width: 100%;
                       border-collapse: collapse;
                       margin: 0 auto;
                       font-size: 15px;
                       font-family: 'Bangla', 'SolaimanLipi', Arial, sans-serif;
                   }
                   .subjects-table th, .subjects-table td {
                       border: 1px solid #6b7280;
                       padding: 12px 16px;
                       text-align: left;
                   }
                                       .subjects-table th {
                        background-color: #f3f4f6;
                        font-weight: 700;
                        color: #000000;
                        font-size: 16px;
                        border-bottom: 2px solid #6b7280;
                    }
                   .subjects-table td {
                       color: #000000;
                       font-weight: 500;
                   }
                  .subjects-table tr:nth-child(even) {
                      background-color: #f9fafb;
                  }
                  .subjects-table tr:nth-child(odd) {
                      background-color: #ffffff;
                  }
                  .summary-section {
                      margin-top: 16px;
                  }
                  .summary-boxes {
                      display: grid;
                      grid-template-columns: repeat(4, 1fr);
                      gap: 16px;
                      margin-top: 16px;
                  }
                  .summary-box {
                      background-color: #f3f4f6;
                      padding: 12px;
                      border: 2px solid #9ca3af;
                      border-radius: 6px;
                      text-align: center;
                  }
                                     .summary-label {
                       font-size: 12px;
                       color: #000000;
                       font-weight: 600;
                       margin-bottom: 4px;
                   }
                  .summary-value {
                      font-size: 20px;
                      font-weight: bold;
                      color: #111827;
                  }
                @media print {
                    body { padding: 20px; }
                    .no-print { display: none; }
                }
                @page {
                    size: A4;
                    margin: 0.5in;
                }
            </style>
        </head>
        <body>
                                                   <div class="school-header">
                  <div class="school-header-content">
                      ${schoolLogo ? `<img src="${schoolLogo}" alt="School Logo" class="school-logo" />` : '<div class="school-header-spacer"></div>'}
                      <div class="school-header-text">
                          <div class="school-name">${schoolName || 'ইকরা নূরানী একাডেমি'}</div>
                          <div class="school-info">${schoolAddress || 'Dhaka, Bangladesh'}</div>
                          ${establishmentYear ? `<div class="school-establishment-year">প্রতিষ্ঠার সাল: ${establishmentYear}</div>` : ''}
                      </div>
                      <div class="school-header-spacer"></div>
                  </div>
              </div>

            ${resultsHTML}
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 250);
      };

    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  const handleDownload = async () => {
    await exportToPDF();
  };

  const handleSearchAgain = () => {
    router.push('/results');
  };

  const formatDateOfBirth = (dateString?: string | any) => {
    if (!dateString) return 'নাই';
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp
      if (dateString && typeof dateString === 'object' && dateString.toDate) {
        date = dateString.toDate();
      } 
      // Handle Timestamp object with seconds property
      else if (dateString && typeof dateString === 'object' && dateString.seconds) {
        date = new Date(dateString.seconds * 1000);
      }
      // Handle string date
      else if (typeof dateString === 'string') {
        date = new Date(dateString);
      }
      // Handle Date object
      else if (dateString instanceof Date) {
        date = dateString;
      }
      else {
        // Try to convert to date
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateString);
        return 'নাই';
      }
      
      // Format as DD-MM-YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date of birth:', error, 'Input:', dateString);
      return 'নাই';
    }
  };

  // Convert English numbers to Bengali numerals
  const toBengaliNumerals = (num: number): string => {
    const englishToBengali: { [key: string]: string } = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    
    return num.toString().replace(/[0-9]/g, (digit) => englishToBengali[digit] || digit);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-8">
        {/* School Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            {/* Logo on Left */}
            <div className="flex-shrink-0">
              {schoolLogo && (
                <img 
                  src={schoolLogo} 
                  alt="School Logo" 
                  className="h-24 w-auto max-w-[180px] object-contain"
                />
              )}
            </div>
            {/* School Info - Centered */}
            <div className="flex-1 text-center">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">{schoolName || 'আমার স্কুল'}</h3>
              {schoolAddress && (
                <p className="text-base md:text-lg text-gray-700 mt-2">{schoolAddress}</p>
              )}
              {establishmentYear && (
                <p className="text-sm md:text-base text-gray-600 mt-1">প্রতিষ্ঠার সাল: {establishmentYear}</p>
              )}
            </div>
            {/* Empty div for balance */}
            <div className="flex-shrink-0 w-[180px]"></div>
          </div>
        </div>
        {/* Exam Title - Separate Section */}
        <div className="mb-4">
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {searchParams.get('examination') || results[0]?.examName || 'SSC/Dakhil/Equivalent Result'} {searchParams.get('year') && searchParams.get('year')}
            </h1>
          </div>
        </div>
      </div>

      {/* Action Buttons - Always visible, hidden when printing */}
      <div className="action-buttons w-full bg-gray-50 border-b border-gray-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={handleSearchAgain}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md font-medium"
            >
              <Search className="w-5 h-5" />
              <span>নতুন করে খুঁজুন</span>
            </button>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownload}
                data-download-btn
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md font-medium"
              >
                <Download className="w-5 h-5" />
                <span>ডাউনলোড করুন</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md font-medium"
              >
                <Printer className="w-5 h-5" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Container */}
      <div className="results-container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {results.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ফলাফল পাওয়া যায়নি
            </h3>
            <p className="text-gray-600 mb-6">
              এই তথ্যের জন্য কোন ফলাফল পাওয়া যায়নি।
            </p>
            <button
              onClick={handleSearchAgain}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors print:hidden"
            >
              নতুন করে খুঁজুন
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {results.map((result, index) => {
              // Calculate rank: use position if available, otherwise use index + 1
              const rank = result.position && result.position > 0 ? result.position : index + 1;
              
              return (
              <div key={result.id} className="bg-white rounded-lg shadow-2xl border-2 border-gray-400 print:shadow-none print:border-2 print:rounded-none">
                {/* School Header */}
                <div className="bg-white border-b-2 border-gray-400 print:border-gray-900 rounded-t-lg">
                  <div className="p-4">
                    {/* Logo on Left, Text in Center */}
                    <div className="flex items-center justify-between">
                      {/* Logo on Left */}
                      <div className="flex-shrink-0">
                        {schoolLogo && (
                          <Link href="/" className="block print:pointer-events-none">
                            <img 
                              src={schoolLogo} 
                              alt="School Logo" 
                              className="h-24 w-auto max-w-[180px] object-contain cursor-pointer hover:opacity-80 transition-opacity print:cursor-default"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </Link>
                        )}
                      </div>
                      {/* School Info - Centered */}
                      <div className="flex-1 text-center">
                        <Link href="/" className="block print:pointer-events-none">
                          <h3 
                            className="text-3xl md:text-4xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors print:cursor-default print:hover:text-gray-900"
                          >
                            {schoolName || 'আমার স্কুল'}
                          </h3>
                        </Link>
                        {schoolAddress && (
                          <p className="text-base md:text-lg text-gray-700 mt-2">{schoolAddress}</p>
                        )}
                        {establishmentYear && (
                          <p className="text-sm md:text-base text-gray-600 mt-1">প্রতিষ্ঠার সাল: {establishmentYear}</p>
                        )}
                      </div>
                      {/* Empty div for balance */}
                      <div className="flex-shrink-0 w-[180px]"></div>
                    </div>
                  </div>
                </div>

                {/* Exam Title Section - Separate */}
                <div className="bg-white border-b-2 border-gray-400 print:border-gray-900">
                  <div className="p-4">
                    <div className="text-center">
                      <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                        {searchParams.get('examination') || result.examName || 'SSC/Dakhil/Equivalent Result'} {searchParams.get('year') && searchParams.get('year')}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Student Information Section */}
                <div className="bg-gray-100 border-b-2 border-gray-400">
                  <div className="grid grid-cols-2 gap-0">
                    {/* Left Column */}
                    <div className="bg-white border-r-2 border-gray-400">
                      <div className="p-4 space-y-3">
                        <div className="flex">
                          <div className="w-36 font-semibold text-gray-700">রোল নম্বর:</div>
                          <div className="flex-1 text-gray-900">{studentInfo?.rollNumber || studentInfo?.studentId || 'নাই'}</div>
                        </div>
                        <div className="flex">
                          <div className="w-36 font-semibold text-gray-700">বোর্ড:</div>
                          <div className="flex-1 text-gray-900">{studentInfo?.board || searchParams.get('board') || 'নাই'}</div>
                        </div>
                        {studentInfo?.group && studentInfo.group.trim() !== '' && (
                          <div className="flex">
                            <div className="w-36 font-semibold text-gray-700">গ্রুপ:</div>
                            <div className="flex-1 text-gray-900">{studentInfo.group}</div>
                          </div>
                        )}
                        <div className="flex">
                          <div className="w-36 font-semibold text-gray-700">ধরন:</div>
                          <div className="flex-1 text-gray-900">নিয়মিত</div>
                        </div>
                        <div className="flex">
                          <div className="w-36 font-semibold text-gray-700">ফলাফল:</div>
                          <div className="flex-1">
                            <span className={`font-bold ${result.status === 'pass' ? 'text-green-700' : 'text-red-700'}`}>
                              {result.status === 'pass' ? 'পাস' : 'অকৃতকার্য'}
                            </span>
                          </div>
                        </div>
                                                 <div className="flex">
                           <div className="w-36 font-semibold text-gray-700">জিপিএ:</div>
                           <div className="flex-1 text-gray-900 font-bold">{toBengaliNumerals(parseFloat(result.overallGPA.toFixed(2)))}</div>
                         </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="bg-white">
                      <div className="p-4 space-y-3">
                        <div className="flex">
                          <div className="w-36 font-semibold text-gray-700">নাম:</div>
                          <div className="flex-1 text-gray-900">{studentInfo?.name || 'নাই'}</div>
                        </div>
                        <div className="flex">
                          <div className="w-36 font-semibold text-gray-700">পিতার নাম:</div>
                          <div className="flex-1 text-gray-900">{studentInfo?.fatherName || 'নাই'}</div>
                        </div>
                        <div className="flex">
                          <div className="w-36 font-semibold text-gray-700">মাতার নাম:</div>
                          <div className="flex-1 text-gray-900">{studentInfo?.motherName || 'নাই'}</div>
                        </div>
                        <div className="flex">
                          <div className="w-36 font-semibold text-gray-700">জন্ম তারিখ:</div>
                          <div className="flex-1 text-gray-900">{formatDateOfBirth(studentInfo?.dateOfBirth)}</div>
                        </div>
                                                 <div className="flex">
                           <div className="w-36 font-semibold text-gray-700">প্রতিষ্ঠানের নাম:</div>
                           <div className="flex-1 text-gray-900">{schoolName || 'নাই'}</div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grade Sheet Section */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-center text-gray-900 mb-6">গ্রেড শীট</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-700 text-white">
                          <th className="border border-gray-500 px-4 py-3 text-left font-semibold">কোড</th>
                          <th className="border border-gray-500 px-4 py-3 text-left font-semibold">বিষয়</th>
                          <th className="border border-gray-500 px-4 py-3 text-left font-semibold">মোট নম্বর</th>
                          <th className="border border-gray-500 px-4 py-3 text-left font-semibold">প্রাপ্ত নম্বর</th>
                          <th className="border border-gray-500 px-4 py-3 text-left font-semibold">গ্রেড</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...result.subjects]
                          .sort((a, b) => {
                            // Sort by subjectCode (numerical)
                            const codeA = parseInt(a.subjectCode || '0') || 0;
                            const codeB = parseInt(b.subjectCode || '0') || 0;
                            return codeA - codeB;
                          })
                          .map((subject, idx) => (
                                                     <tr 
                             key={idx} 
                             className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                           >
                             <td className="border border-gray-400 px-4 py-3 text-gray-900">{subject.subjectCode ? toBengaliNumerals(parseInt(subject.subjectCode) || 0) : toBengaliNumerals(idx + 1).padStart(3, '০')}</td>
                             <td className="border border-gray-400 px-4 py-3 text-gray-900">{subject.subject}</td>
                             <td className="border border-gray-400 px-4 py-3 text-gray-900">{toBengaliNumerals(subject.totalMarks)}</td>
                             <td className="border border-gray-400 px-4 py-3 text-gray-900">{toBengaliNumerals(subject.obtainedMarks)}</td>
                             <td className="border border-gray-400 px-4 py-3 text-gray-900 font-semibold">{subject.grade || 'N/A'}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                                     {/* Summary Row */}
                   <div className="mt-4 grid grid-cols-4 gap-4">
                     <div className="bg-gray-100 p-3 border-2 border-gray-400 rounded-md">
                       <div className="text-sm text-gray-600 mb-1">মোট নম্বর</div>
                       <div className="text-xl font-bold text-gray-900">{toBengaliNumerals(result.totalObtainedMarks)} / {toBengaliNumerals(result.totalMarks)}</div>
                     </div>
                     <div className="bg-gray-100 p-3 border-2 border-gray-400 rounded-md">
                       <div className="text-sm text-gray-600 mb-1">শতাংশ</div>
                       <div className="text-xl font-bold text-gray-900">{toBengaliNumerals(parseFloat(((result.totalObtainedMarks / result.totalMarks) * 100).toFixed(2)))}%</div>
                     </div>
                     <div className="bg-gray-100 p-3 border-2 border-gray-400 rounded-md">
                       <div className="text-sm text-gray-600 mb-1">সামগ্রিক গ্রেড</div>
                       <div className="text-xl font-bold text-gray-900">{result.overallGrade}</div>
                     </div>
                                          <div className="bg-gray-100 p-3 border-2 border-gray-400 rounded-md">
                        <div className="text-sm text-gray-600 mb-1">অবস্থান</div>
                        <div className="text-xl font-bold">
                         {rank <= 3 ? (
                           <div className="flex items-center justify-center space-x-2">
                             <Trophy className={`w-6 h-6 ${
                               rank === 1 ? 'text-yellow-500' :
                               rank === 2 ? 'text-gray-400' :
                               'text-orange-600'
                             }`} />
                             <span className={
                               rank === 1 ? 'text-yellow-600' :
                               rank === 2 ? 'text-gray-600' :
                               'text-orange-600'
                             }>
                               {toBengaliNumerals(rank)}
                             </span>
                           </div>
                         ) : (
                           <span className="text-gray-900">{toBengaliNumerals(rank)}</span>
                         )}
                       </div>
                     </div>
                   </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Download and Search Again Button Section - At the bottom of the page */}
        {results.length > 0 && (
          <div className="mt-8 flex justify-center gap-3 print:hidden">
            <button
              onClick={handleDownload}
              data-download-btn
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors shadow-md font-medium"
              title="রেজাল্ট ডাউনলোড করুন"
            >
              <Download className="w-5 h-5" />
              <span>রেজাল্ট ডাউনলোড করুন</span>
            </button>
            <button
              onClick={handleSearchAgain}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors shadow-md font-medium"
              title="নতুন করে খুঁজুন"
            >
              <Search className="w-5 h-5" />
              <span>নতুন করে খুঁজুন</span>
            </button>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          nav {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
};

export default ResultsViewPage;

