import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET /api/downloads/[file] - Download project files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await params;
    
    // Define available files for download
    const availableFiles: Record<string, { path: string; filename: string; contentType: string }> = {
      'pre-commit-hook': {
        path: path.join(process.cwd(), '..', '..', '..', 'pre-commit-hook.py'),
        filename: 'pre-commit-hook.py',
        contentType: 'text/x-python',
      },
      'install-hook-bat': {
        path: path.join(process.cwd(), '..', '..', '..', 'install-hook.bat'),
        filename: 'install-hook.bat',
        contentType: 'application/x-bat',
      },
      'install-hook-sh': {
        path: path.join(process.cwd(), '..', '..', '..', 'install-hook.sh'),
        filename: 'install-hook.sh',
        contentType: 'application/x-sh',
      },
    };

    // Check if file exists in available files
    if (!availableFiles[file]) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileInfo = availableFiles[file];
    const filePath = fileInfo.path;

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return NextResponse.json(
        { error: 'File not found on server' },
        { status: 404 }
      );
    }

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Return file as download
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': fileInfo.contentType,
        'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
        'Content-Length': fileContent.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file', details: error.message },
      { status: 500 }
    );
  }
}
