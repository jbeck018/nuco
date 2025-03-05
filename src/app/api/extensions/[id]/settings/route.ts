import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createExtensionService } from '@/lib/extensions/service';

/**
 * GET handler for extension settings
 * Gets the settings of an extension
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
    
    // Get settings
    const settings = extension.settings;
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error getting extension settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for extension settings
 * Updates the settings of an extension
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
    
    // Update settings
    const updatedExtension = await extensionService.updateExtensionSettings(
      id,
      body.values
    );
    
    return NextResponse.json(updatedExtension.settings);
  } catch (error) {
    console.error('Error updating extension settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 