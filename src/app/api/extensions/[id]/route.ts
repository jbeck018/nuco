import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createExtensionService } from '@/lib/extensions/service';

/**
 * GET handler for a specific extension
 * Gets details of a specific extension
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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
    
    return NextResponse.json(extension);
  } catch (error) {
    console.error('Error getting extension:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for a specific extension
 * Updates an extension's settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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
    
    // Get request body
    const body = await request.json();
    
    // Update extension settings
    const updatedExtension = await extensionService.updateExtensionSettings(
      id,
      body.settings
    );
    
    return NextResponse.json(updatedExtension);
  } catch (error) {
    console.error('Error updating extension:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for a specific extension
 * Uninstalls an extension
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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
    
    // Uninstall extension
    await extensionService.uninstallExtension(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error uninstalling extension:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 