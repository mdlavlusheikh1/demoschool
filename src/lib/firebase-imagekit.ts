import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  DocumentData 
} from 'firebase/firestore';
import { uploadToImageKit, deleteFromImageKit, ImageKitFile } from './imagekit-utils';

// Types for Firebase media records
export interface MediaRecord {
  id?: string;
  fileId: string; // ImageKit file ID
  name: string;
  url: string; // ImageKit URL
  thumbnailUrl: string;
  type: 'image' | 'video' | 'document';
  category: 'student' | 'teacher' | 'school' | 'document' | 'gallery';
  userId?: string; // Student/Teacher ID
  schoolId: string;
  size: number;
  width?: number;
  height?: number;
  uploadedBy: string; // User email who uploaded
  createdAt: any;
  updatedAt: any;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Upload file to ImageKit and save record to Firebase
export async function uploadMediaToImageKitAndFirebase(
  file: File,
  category: 'student' | 'teacher' | 'school' | 'document' | 'gallery',
  schoolId: string,
  uploadedBy: string,
  userId?: string,
  tags?: string[]
): Promise<MediaRecord> {
  try {
    // Upload to ImageKit first
    let imagekitFile: ImageKitFile;
    
    switch (category) {
      case 'student':
        if (!userId) throw new Error('Student ID is required for student uploads');
        const { uploadStudentPhoto } = await import('./imagekit-utils');
        imagekitFile = await uploadStudentPhoto(file, userId, schoolId);
        break;
      case 'teacher':
        if (!userId) throw new Error('Teacher ID is required for teacher uploads');
        const { uploadTeacherPhoto } = await import('./imagekit-utils');
        imagekitFile = await uploadTeacherPhoto(file, userId, schoolId);
        break;
      case 'school': {
        // Use client-side upload for school logo (since this runs in browser)
        const publicKeySchool = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (!publicKeySchool) {
          throw new Error('ImageKit public key not configured');
        }

        // Get authentication parameters
        const authResponseSchool = await fetch('/api/imagekit');
        if (!authResponseSchool.ok) {
          const errorDataSchool = await authResponseSchool.json().catch(() => ({ message: 'ImageKit authentication failed' }));
          throw new Error(errorDataSchool.message || 'Failed to get ImageKit authentication');
        }

        const authDataSchool = await authResponseSchool.json();
        if (!authDataSchool.token || !authDataSchool.signature || !authDataSchool.expire) {
          throw new Error('Invalid authentication parameters from server');
        }

        // Create FormData for upload
        const uploadFormDataSchool = new FormData();
        uploadFormDataSchool.append('file', file);
        uploadFormDataSchool.append('fileName', `school-logo-${Date.now()}-${file.name}`);
        uploadFormDataSchool.append('folder', `/school-management/school-logos/${schoolId}`);
        uploadFormDataSchool.append('tags', ['school', schoolId, 'logo'].join(','));
        uploadFormDataSchool.append('token', authDataSchool.token);
        uploadFormDataSchool.append('expire', authDataSchool.expire.toString());
        uploadFormDataSchool.append('signature', authDataSchool.signature);
        uploadFormDataSchool.append('publicKey', publicKeySchool);

        // Upload to ImageKit REST API
        const uploadResponseSchool = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: uploadFormDataSchool,
        });

        if (!uploadResponseSchool.ok) {
          const errorTextSchool = await uploadResponseSchool.text();
          throw new Error(`ImageKit upload failed: ${errorTextSchool}`);
        }

        const uploadResultSchool = await uploadResponseSchool.json();

        // Convert ImageKit response to ImageKitFile format
        imagekitFile = {
          fileId: uploadResultSchool.fileId,
          name: uploadResultSchool.name,
          url: uploadResultSchool.url,
          thumbnailUrl: uploadResultSchool.thumbnailUrl || uploadResultSchool.url,
          height: uploadResultSchool.height || 0,
          width: uploadResultSchool.width || 0,
          size: uploadResultSchool.size,
          type: uploadResultSchool.fileType || file.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          AITags: uploadResultSchool.AITags || []
        };
        break;
      }
      case 'document':
        if (!userId) throw new Error('User ID is required for document uploads');
        const { uploadDocument } = await import('./imagekit-utils');
        imagekitFile = await uploadDocument(file, 'document', userId, schoolId);
        break;
      case 'gallery': {
        // Use client-side upload for gallery (since this runs in browser)
        const publicKeyGallery = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (!publicKeyGallery) {
          throw new Error('ImageKit public key not configured');
        }

        // Get authentication parameters
        const authResponseGallery = await fetch('/api/imagekit');
        if (!authResponseGallery.ok) {
          const errorDataGallery = await authResponseGallery.json().catch(() => ({ message: 'ImageKit authentication failed' }));
          throw new Error(errorDataGallery.message || 'Failed to get ImageKit authentication');
        }

        const authDataGallery = await authResponseGallery.json();
        if (!authDataGallery.token || !authDataGallery.signature || !authDataGallery.expire) {
          throw new Error('Invalid authentication parameters from server');
        }

        // Create FormData for upload
        const uploadFormDataGallery = new FormData();
        uploadFormDataGallery.append('file', file);
        uploadFormDataGallery.append('fileName', `gallery-${Date.now()}-${file.name}`);
        uploadFormDataGallery.append('folder', `/school-management/gallery/${schoolId}`);
        uploadFormDataGallery.append('tags', ['gallery', schoolId, ...(tags || [])].join(','));
        uploadFormDataGallery.append('token', authDataGallery.token);
        uploadFormDataGallery.append('expire', authDataGallery.expire.toString());
        uploadFormDataGallery.append('signature', authDataGallery.signature);
        uploadFormDataGallery.append('publicKey', publicKeyGallery);

        // Upload to ImageKit REST API
        const uploadResponseGallery = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: uploadFormDataGallery,
        });

        if (!uploadResponseGallery.ok) {
          const errorTextGallery = await uploadResponseGallery.text();
          throw new Error(`ImageKit upload failed: ${errorTextGallery}`);
        }

        const uploadResultGallery = await uploadResponseGallery.json();

        // Convert ImageKit response to ImageKitFile format
        imagekitFile = {
          fileId: uploadResultGallery.fileId,
          name: uploadResultGallery.name,
          url: uploadResultGallery.url,
          thumbnailUrl: uploadResultGallery.thumbnailUrl || uploadResultGallery.url,
          height: uploadResultGallery.height || 0,
          width: uploadResultGallery.width || 0,
          size: uploadResultGallery.size,
          type: uploadResultGallery.fileType || file.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          AITags: uploadResultGallery.AITags || []
        };
        break;
      }
      default:
        throw new Error(`Unknown category: ${category}`);
    }

    // Create media record for Firebase
    // Filter out undefined values to prevent Firestore errors
    const mediaRecord: any = {
      fileId: imagekitFile.fileId,
      name: imagekitFile.name,
      url: imagekitFile.url,
      thumbnailUrl: imagekitFile.thumbnailUrl,
      type: imagekitFile.type.startsWith('image/') ? 'image' : 
            imagekitFile.type.startsWith('video/') ? 'video' : 'document',
      category,
      schoolId,
      size: imagekitFile.size,
      uploadedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tags: tags || [],
      metadata: {
        originalFileName: file.name,
        mimeType: file.type,
        imagekitTags: imagekitFile.AITags || []
      }
    };

    // Only include userId if it's defined
    if (userId) {
      mediaRecord.userId = userId;
    }

    // Only include width/height if they're defined
    if (imagekitFile.width) {
      mediaRecord.width = imagekitFile.width;
    }
    if (imagekitFile.height) {
      mediaRecord.height = imagekitFile.height;
    }

    // Save to Firebase
    const docRef = await addDoc(collection(db, 'media'), mediaRecord);
    
    return {
      id: docRef.id,
      ...mediaRecord,
      createdAt: new Date(),
      updatedAt: new Date()
    } as MediaRecord;

  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get media records from Firebase
export async function getMediaFromFirebase(
  schoolId: string,
  category?: string,
  userId?: string
): Promise<MediaRecord[]> {
  try {
    let q = query(
      collection(db, 'media'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc')
    );

    if (category) {
      q = query(q, where('category', '==', category));
    }

    if (userId) {
      q = query(q, where('userId', '==', userId));
    }

    const querySnapshot = await getDocs(q);
    const media: MediaRecord[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      media.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as MediaRecord);
    });

    return media;
  } catch (error) {
    console.error('Error fetching media:', error);
    throw new Error(`Failed to fetch media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Delete media from both ImageKit and Firebase
export async function deleteMediaFromImageKitAndFirebase(
  mediaId: string,
  fileId: string
): Promise<void> {
  try {
    // Delete from ImageKit first
    await deleteFromImageKit(fileId);

    // Delete from Firebase
    await deleteDoc(doc(db, 'media', mediaId));
  } catch (error) {
    console.error('Error deleting media:', error);
    throw new Error(`Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update media record in Firebase
export async function updateMediaInFirebase(
  mediaId: string,
  updates: Partial<MediaRecord>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'media', mediaId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating media:', error);
    throw new Error(`Failed to update media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get media by category and user
export async function getUserMedia(
  schoolId: string,
  userId: string,
  category: 'student' | 'teacher'
): Promise<MediaRecord[]> {
  return getMediaFromFirebase(schoolId, category, userId);
}

// Get school gallery
export async function getSchoolGallery(schoolId: string): Promise<MediaRecord[]> {
  return getMediaFromFirebase(schoolId, 'gallery');
}

// Get school logos
export async function getSchoolLogos(schoolId: string): Promise<MediaRecord[]> {
  return getMediaFromFirebase(schoolId, 'school');
}