import { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { verifyAuth } from './utils/auth';

const FIELD_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'], 
  supervisor: [
    'hour', 'dockCode', 'schedArrivalTime', 'schedStartDate', 
    'adjustedStartTime', 'scheduleEndDate', 'scheduleEndTime', 
    'scac', 'statusOX', 'trailer1', 'trailer2', 'gateArrivalTime', 
    'actualStartTime', 'actualEndTime', 'door'
  ],
  clerk: [
    'gateArrivalTime', 'actualStartTime', 'actualEndTime', 
    'door', 'dockComments'
  ],
  receiving: [
    'statusOX'
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

    const currentTrailer = await sql`
      SELECT * FROM trailers WHERE uuid = ${uuid}
    `
    const updatedTrailer = {
      ...currentTrailer[0],
      ...trailer
    }
    // Get list of fields being updated (exclude uuid)
    const changedFields = Object.keys(trailer).filter(key => {
      if (key === 'uuid') return false
      return currentTrailer[0][key] !== trailer[key]
    })
    console.log(changedFields)
    // Check permissions
    const permissionCheck = canUpdateFields(auth.user!.role, changedFields);
    
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
        hour = ${updatedTrailer.hour},
        "dateShift" = ${updatedTrailer.dateShift},
        "lmsAccent" = ${updatedTrailer.lmsAccent},
        "dockCode" = ${updatedTrailer.dockCode},
        "acaType" = ${updatedTrailer.acaType},
        status = ${updatedTrailer.status},
        "routeId" = ${updatedTrailer.routeId},
        scac = ${updatedTrailer.scac},
        trailer1 = ${updatedTrailer.trailer1},
        trailer2 = ${updatedTrailer.trailer2},
        "firstSupplier" = ${updatedTrailer.firstSupplier},
        "dockStopSequence" = ${updatedTrailer.dockStopSequence},
        "planStartDate" = ${updatedTrailer.planStartDate},
        "planStartTime" = ${updatedTrailer.planStartTime},
        "scheduleStartDate" = ${updatedTrailer.scheduleStartDate},
        "adjustedStartTime" = ${updatedTrailer.adjustedStartTime},
        "scheduleEndDate" = ${updatedTrailer.scheduleEndDate},
        "scheduleEndTime" = ${updatedTrailer.scheduleEndTime},
        "gateArrivalTime" = ${updatedTrailer.gateArrivalTime},
        "actualStartTime" = ${updatedTrailer.actualStartTime},
        "actualEndTime" = ${updatedTrailer.actualEndTime},
        "statusOX" = ${updatedTrailer.statusOX},
        "ryderComments" = ${updatedTrailer.ryderComments},
        "gmComments" = ${updatedTrailer.gmComments},
        "lowestDoh" = ${updatedTrailer.lowestDoh},
        door = ${updatedTrailer.door},
        "dockComments" = ${updatedTrailer.dockComments}
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
        ${JSON.stringify(changedFields)},
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
        updatedFields: changedFields
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