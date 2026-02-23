import { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyAuth } from './utils/auth';

// Define which fields each role can update
const FIELD_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'], // Can update everything
  supervisor: [
    'hour', 'dateShift', 'dockCode', 'status', 'door', 'scac',
    'gateArrivalTime', 'actualStartTime', 'actualEndTime', 'statusOX'
  ],
  clerk: [
    'gateArrivalTime', 'actualStartTime', 'actualEndTime', 
    'door'
  ],
  receiving: [
    'hour', 'dateShift', 'dockCode', 'status', 'door', 'scac',
    'gateArrivalTime', 'actualStartTime', 'actualEndTime', 'statusOX'
  ],
  mfu: [
    'ryderComments'
  ],
  security: [
    'gateArrivalTime', 'gmComments'
  ]
};

// Check if user can update the requested fields
function canUpdateFields(userRole: string, fieldsToUpdate: string[]): { allowed: boolean; deniedFields: string[] } {
  const allowedFields = FIELD_PERMISSIONS[userRole] || [];
  
  // Admin can update everything
  if (allowedFields.includes('*')) {
    return { allowed: true, deniedFields: [] };
  }

  const deniedFields = fieldsToUpdate.filter(field => !allowedFields.includes(field));
  
  return {
    allowed: deniedFields.length === 0,
    deniedFields
  };
}

const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Require authentication
  const auth = await verifyAuth(event.headers.authorization);
    
  if (!auth.authorized) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: auth.error })
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const trailer = JSON.parse(event.body || '{}');
    const uuid = event.queryStringParameters?.uuid || trailer.uuid;

    if (!uuid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'UUID is required' })
      };
    }

    // Get list of fields being updated (exclude uuid)
    const fieldsToUpdate = Object.keys(trailer).filter(key => key !== 'uuid');
    
    // Check permissions
    const permissionCheck = canUpdateFields(auth.user!.role, fieldsToUpdate);
    
    if (!permissionCheck.allowed) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Insufficient permissions',
          deniedFields: permissionCheck.deniedFields,
          message: `Role '${auth.user!.role}' cannot update: ${permissionCheck.deniedFields.join(', ')}`
        })
      };
    }

    const result = await sql`
      UPDATE trailers
      SET 
        hour = ${trailer.hour},
        "dateShift" = ${trailer.dateShift},
        "lmsAccent" = ${trailer.lmsAccent},
        "dockCode" = ${trailer.dockCode},
        "acaType" = ${trailer.acaType},
        status = ${trailer.status},
        "routeId" = ${trailer.routeId},
        scac = ${trailer.scac},
        trailer1 = ${trailer.trailer1},
        trailer2 = ${trailer.trailer2},
        "firstSupplier" = ${trailer.firstSupplier},
        "dockStopSequence" = ${trailer.dockStopSequence},
        "planStartDate" = ${trailer.planStartDate},
        "planStartTime" = ${trailer.planStartTime},
        "scheduleStartDate" = ${trailer.scheduleStartDate},
        "adjustedStartTime" = ${trailer.adjustedStartTime},
        "scheduleEndDate" = ${trailer.scheduleEndDate},
        "scheduleEndTime" = ${trailer.scheduleEndTime},
        "gateArrivalTime" = ${trailer.gateArrivalTime},
        "actualStartTime" = ${trailer.actualStartTime},
        "actualEndTime" = ${trailer.actualEndTime},
        "statusOX" = ${trailer.statusOX},
        "ryderComments" = ${trailer.ryderComments},
        "gmComments" = ${trailer.gmComments},
        "lowestDoh" = ${trailer.lowestDoh},
        door = ${trailer.door}
      WHERE uuid = ${uuid}
      RETURNING *
    `;

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Trailer not found' })
      };
    }

    await sql`
      INSERT INTO trailer_update_audit (
        trailer_uuid,
        updated_by_user_id,
        updated_by_email,
        updated_fields,
        timestamp
      ) VALUES (
        ${uuid},
        ${auth.user!.userId},
        ${auth.user!.email},
        ${JSON.stringify(fieldsToUpdate)},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        trailer: result[0],
        message: 'Trailer updated successfully',
        updatedBy: auth.user!.email,
        updatedFields: fieldsToUpdate
      })
    };
  } catch (error: any) {
    console.error('Error updating trailer:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }``
};

export { handler };