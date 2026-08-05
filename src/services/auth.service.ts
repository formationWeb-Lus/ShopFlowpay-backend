import bcrypt from "bcryptjs";

import { prisma } from "../config/database";



export async function createUser(
  data:{
    name?: string;
    email:string;
    password:string;
    phone?:string;
  }
){


  const existing =
    await prisma.user.findUnique({
      where:{
        email:data.email
      }
    });



  if(existing){
    throw new Error(
      "Email already exists"
    );
  }



  const hashedPassword =
    await bcrypt.hash(
      data.password,
      10
    );



  return prisma.user.create({

    data:{
      name:data.name,

      email:data.email,

      phone:data.phone,

      password:hashedPassword
    }

  });


}