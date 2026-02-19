import { neon } from '@neondatabase/serverless';

exports.handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const trailers = JSON.parse(event.body);
    
    console.log(`Received ${trailers.length} trailers to insert`);

    await sql.transaction(
      trailers.map((trailer: any) => sql`
        INSERT INTO staged_trailers (
          uuid, hour, "dateShift", "lmsAccent", "dockCode", "acaType",
          status, "routeId", scac, trailer1, trailer2, "firstSupplier",
          "dockStopSequence", "planStartDate", "planStartTime",
          "scheduleStartDate", "adjustedStartTime", "scheduleEndDate",
          "scheduleEndTime", door, "gateArrivalTime", "actualStartTime",
          "actualEndTime", "statusOX", "ryderComments", "gmComments",
          "lowestDoh"
        ) VALUES (
          ${trailer.uuid}, ${trailer.hour}, ${trailer.dateShift},
          ${trailer.lmsAccent}, ${trailer.dockCode}, ${trailer.acaType},
          ${trailer.status}, ${trailer.routeId}, ${trailer.scac},
          ${trailer.trailer1}, ${trailer.trailer2}, ${trailer.firstSupplier},
          ${trailer.dockStopSequence}, ${trailer.planStartDate},
          ${trailer.planStartTime}, ${trailer.scheduleStartDate},
          ${trailer.adjustedStartTime}, ${trailer.scheduleEndDate},
          ${trailer.scheduleEndTime}, ${trailer.door}, ${trailer.gateArrivalTime},
          ${trailer.actualStartTime}, ${trailer.actualEndTime},
          ${trailer.statusOX}, ${trailer.ryderComments}, ${trailer.gmComments},
          ${trailer.lowestDoh}
        )
      `)
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: `Successfully inserted ${trailers.length} trailers`,
        count: trailers.length 
      })
    };
  } catch (error: any) {
    console.error('Bulk insert error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};