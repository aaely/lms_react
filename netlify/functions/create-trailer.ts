import { neon } from '@neondatabase/serverless';

exports.handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Function started');
    console.log('Event body:', event.body);
    
    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set');
      throw new Error('Database connection string not configured');
    }
    
    const sql = neon(process.env.DATABASE_URL);
    console.log('Neon client initialized');
    
    const trailer = JSON.parse(event.body);
    console.log('Parsed trailer data:', trailer);
    
    // Log the SQL query for debugging
    console.log('Attempting to insert trailer with UUID:', trailer.uuid);
    
    // Your insert query here
    const result = await sql`
      INSERT INTO trailers (
        uuid, hour, "dateShift", "lmsAccent", "dockCode", "acaType",
        status, "routeId", scac, trailer1, trailer2, "firstSupplier",
        "dockStopSequence", "planStartDate", "planStartTime",
        "scheduleStartDate", "adjustedStartTime", "scheduleEndDate",
        "scheduleEndTime", "gateArrivalTime", "actualStartTime",
        "actualEndTime", "statusOx", "ryderComments", "gmComments"
      ) VALUES (
        ${trailer.uuid}, ${trailer.hour}, ${trailer.dateShift},
        ${trailer.lmsAccent}, ${trailer.dockCode}, ${trailer.acaType},
        ${trailer.status}, ${trailer.routeId}, ${trailer.scac},
        ${trailer.trailer1}, ${trailer.trailer2}, ${trailer.firstSupplier},
        ${trailer.dockStopSequence}, ${trailer.planStartDate},
        ${trailer.planStartTime}, ${trailer.scheduleStartDate},
        ${trailer.adjustedStartTime}, ${trailer.scheduleEndDate},
        ${trailer.scheduleEndTime}, ${trailer.gateArrivalTime},
        ${trailer.actualStartTime}, ${trailer.actualEndTime},
        ${trailer.statusOx}, ${trailer.ryderComments}, ${trailer.gmComments}
      )
      RETURNING *
    `;
    
    console.log('Insert successful, returned:', result[0]);
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(result[0])
    };
    
  } catch (error: any) {
    console.error('❌ Function error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack // Include stack for debugging (remove in production)
      })
    };
  }
};