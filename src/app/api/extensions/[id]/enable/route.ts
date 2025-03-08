export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createExtensionService } from '@/lib/extensions/service';
import { IdParam } from '@/lib/shared-types';

/**
 * POST handler for enabling an extension
 */
export async function POST(
  request: NextRequest,
  data: { params: IdParam }
): Promise<NextResponse> {
  const params = await data.params;
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get extension ID from params
    const { id } = params;
    
    // Create extension service
    const extensionService = createExtensionService();
    
    // Get extension
    const extension = await extensionService.getExtensionById(id);
    
    if (!extension) {
      return NextResponse.json(
        { error: 'Extension not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has access to this extension
    if (extension.userId !== session.user.id && 
        extension.organizationId !== session.user.defaultOrganizationId) {
      return NextResponse.json(
        { error: 'Unauthorized to access this extension' },
        { status: 403 }
      );
    }
    
    // Enable extension
    const updatedExtension = await extensionService.enableExtension(id);
    
    return NextResponse.json(updatedExtension);
  } catch (error) {
    console.error('Error enabling extension:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 