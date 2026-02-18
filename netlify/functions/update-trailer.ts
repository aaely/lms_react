import { neon } from '@neondatabase/serverless';

exports.handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow PUT method
  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const trailer = JSON.parse(event.body);
    const uuid = event.queryStringParameters?.uuid || trailer.uuid;

    if (!uuid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'UUID is required' })
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
        "gmComments" = ${trailer.GMComments},
        "lowestDoh" = ${trailer.lowestDoh},
        door = ${trailer.door}
      WHERE uuid = ${uuid}
      RETURNING *
    `;

    // Check if any row was updated
    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Trailer not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        trailer: result[0],
        message: 'Trailer updated successfully'
      })
    };
  } catch (error: any) {
    console.error('Error updating trailer:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};