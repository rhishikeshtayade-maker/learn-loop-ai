import prisma from '../src/prisma';

async function listUsers(){
  const users = await prisma.user.findMany({select:{id:true,name:true,email:true}});
  console.log('Users:', JSON.stringify(users,null,2));
}
listUsers().catch(e=>{console.error(e);process.exit(1);});
