/**
 * Secure User Creation API
 * Server-side validation for user creation with role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { validateUserData, canAssignRole, isValidPassword } from '@/lib/security';
import { logUserCreated, AuditSeverity } from '@/lib/audit-logger';

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Firebase Admin credentials missing:', {
        projectId: !!projectId,
        clientEmail: !!clientEmail,
        privateKey: !!privateKey,
      });
      throw new Error('Firebase Admin credentials not configured. Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY environment variables.');
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const currentUserId = decodedToken.uid;

    // Get current user's data from Firestore
    const db = getFirestore();
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    
    if (!currentUserDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentUser = currentUserDoc.data();
    const currentUserRole = currentUser?.role;

    // Parse request body
    const body = await request.json();
    const { email, password, name, role, schoolId, phone } = body;

    // Validate input data
    const validation = validateUserData({ email, name, role, phone });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Validate password
    if (!password || !isValidPassword(password)) {
      return NextResponse.json(
        { 
          error: 'Invalid password',
          details: ['Password must be at least 8 characters with uppercase, lowercase, number, and special character']
        },
        { status: 400 }
      );
    }

    // Check if current user can assign this role
    if (!canAssignRole(currentUserRole, role)) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot assign this role' },
        { status: 403 }
      );
    }

    // For school-specific roles, validate schoolId
    if (role !== 'super_admin' && !schoolId) {
      return NextResponse.json(
        { error: 'School ID is required for this role' },
        { status: 400 }
      );
    }

    // Verify school admin can only create users in their school
    if (currentUserRole === 'school_admin' && currentUser.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only create users in your school' },
        { status: 403 }
      );
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });

    // Create user document in Firestore
    const userData = {
      email,
      name,
      role,
      schoolId: schoolId || null,
      phone: phone || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUserId,
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    // Log the action
    await logUserCreated(
      currentUserId,
      currentUserRole,
      userRecord.uid,
      email,
      role,
      schoolId
    );

    return NextResponse.json(
      {
        success: true,
        userId: userRecord.uid,
        message: 'User created successfully',
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
