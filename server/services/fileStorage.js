
class FileStorageService {
  constructor(storageType = 'database') {
    this.storageType = storageType;
  }

  async saveFile(fileBuffer, filename, originalName, mimeType, relatedTable, relatedId, uploadedBy) {
    try {
      switch (this.storageType) {
        case 'database':
          return await this.saveToDatabase(fileBuffer, filename, originalName, mimeType, relatedTable, relatedId, uploadedBy);
        
        case 'base64':
          return await this.saveAsBase64(fileBuffer, filename, originalName, mimeType, relatedTable, relatedId, uploadedBy);
        
        default:
          return await this.saveToDatabase(fileBuffer, filename, originalName, mimeType, relatedTable, relatedId, uploadedBy);
      }
    } catch (error) {
      console.error('File storage error:', error);
      throw error;
    }
  }

  async saveToDatabase(fileBuffer, filename, originalName, mimeType, relatedTable, relatedId, uploadedBy) {
    const db = require('../db');
    
    const result = await db.query(`
      INSERT INTO file_storage (filename, original_name, mime_type, file_data, file_size, related_table, related_id, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, filename, original_name, file_size, uploaded_at
    `, [filename, originalName, mimeType, fileBuffer, fileBuffer.length, relatedTable, relatedId, uploadedBy]);

    return {
      id: result.rows[0].id,
      filename: result.rows[0].filename,
      originalName: result.rows[0].original_name,
      size: result.rows[0].file_size,
      uploadedAt: result.rows[0].uploaded_at,
      storageType: 'database'
    };
  }

  async saveAsBase64(fileBuffer, filename, originalName, mimeType, relatedTable, relatedId, uploadedBy) {
    const db = require('../db');
    
    // Convert buffer to base64
    const base64Data = fileBuffer.toString('base64');
    
    const result = await db.query(`
      INSERT INTO file_storage (filename, original_name, mime_type, file_data, file_size, related_table, related_id, uploaded_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, filename, original_name, file_size, uploaded_at
    `, [filename, originalName, mimeType, base64Data, fileBuffer.length, relatedTable, relatedId, uploadedBy, JSON.stringify({encoding: 'base64'})]);

    return {
      id: result.rows[0].id,
      filename: result.rows[0].filename,
      originalName: result.rows[0].original_name,
      size: result.rows[0].file_size,
      uploadedAt: result.rows[0].uploaded_at,
      storageType: 'base64'
    };
  }

  async getFile(fileId) {
    const db = require('../db');
    
    const result = await db.query(`
      SELECT * FROM file_storage WHERE id = $1
    `, [fileId]);

    if (result.rows.length === 0) {
      throw new Error('File not found');
    }

    const file = result.rows[0];
    let fileData;

    // Check if it's base64 encoded
    if (file.metadata && JSON.parse(file.metadata).encoding === 'base64') {
      fileData = Buffer.from(file.file_data, 'base64');
    } else {
      fileData = file.file_data;
    }

    return {
      id: file.id,
      filename: file.filename,
      originalName: file.original_name,
      mimeType: file.mime_type,
      data: fileData,
      size: file.file_size,
      uploadedAt: file.uploaded_at
    };
  }

  async deleteFile(fileId) {
    const db = require('../db');
    
    // Check if file exists
    const fileRecord = await db.query('SELECT * FROM file_storage WHERE id = $1', [fileId]);
    if (fileRecord.rows.length === 0) {
      throw new Error('File not found');
    }
    
    // Delete from database
    await db.query('DELETE FROM file_storage WHERE id = $1', [fileId]);
    
    return true;
  }
}

module.exports = FileStorageService;
