import { neon } from '@neondatabase/serverless';

exports.handler = async (event: any) => {
  const headers = { 'Access-Control-Allow-Origin': '*' };

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const trailer = JSON.parse(event.body);

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

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(result[0]),
    };
  } catch (error) {
    console.error('Create error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create trailer' }),
    };
  }
};