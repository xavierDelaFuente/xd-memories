import { getAuth } from '../../../../lib/auth';

// Better Auth's HTTP API (sessions, sign-out from other clients, later email links).
const handle = (request: Request) => getAuth().handler(request);

export { handle as GET, handle as POST };
