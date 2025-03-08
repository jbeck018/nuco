export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createExtensionService } from '@/lib/extensions/service';
import { validateManifestSafe } from '@/lib/extensions/schema';

/**
 * GET handler for extensions
 * Lists all extensions for the current user or organization
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId') || session.user.defaultOrganizationId;
    
    // Create extension service
    const extensionService = createExtensionService();
    
    // Get extensions
    const extensions = await extensionService.getExtensions(
      session.user.id,
      organizationId
    );
    
    return NextResponse.json(extensions);
  } catch (error) {
    console.error('Error getting extensions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for extensions
 * Installs a new extension
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    // Validate manifest
    const validationResult = validateManifestSafe(body.manifest);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid extension manifest',
          details: validationResult.errors?.format()
        },
        { status: 400 }
      );
    }
    
    // Create extension service
    const extensionService = createExtensionService();
    
    // Install extension
    const extension = await extensionService.installExtension(
      validationResult.data!,
      session.user.id,
      body.organizationId || session.user.defaultOrganizationId,
      body.source || 'custom'
    );
    
    return NextResponse.json(extension);
  } catch (error) {
    console.error('Error installing extension:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 