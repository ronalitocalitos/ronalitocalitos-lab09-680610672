import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import type { User, CustomRequest , UserPayload } from "../libs/types.ts";

// import database
import { users, reset_users ,courses, students, enrollments } from "../db/db.ts";
import { zStudentId } from "@src/libs/zodValidators.js";
import { success } from "zod";
import { zEnrollmentBody } from "../libs/zodValidators.ts";
import { en } from "zod/v4/locales";


const router = Router();

router.get('/',(req,res)=>{
  const authHeader = req.headers["authorization"];
  if(!authHeader || !authHeader.startsWith("Bearer ")){
      return res.status(401).json({
          success: false,
          message: "Authorization header is required"
      })
  }

  const token = authHeader.split(" ")[1];
  if(token === null){
    return res.status(401).json({
      success: false,
      message: "Token is required"
    })
  }

  try{
    const jwt_secret = process.env.JWT_SECRET || "this_is_my_secret";
    jwt.verify(token, jwt_secret, (err, payload)=>{
      if(err){
        return res.status(403).json({
          success: false,
          message: "Invalid or expired token"
        });
      }

      //find user by payload
      const user_payload = payload as UserPayload;
      const user = users.find((u)=> u.username===user_payload.username)
    
      if(!user){
        return res.status(403).json({
          success: false,
          message: "Unauthorized user"
        })
      }

      if(user.role === "ADMIN"){
        return res.status(200).json({
          success: true,
          data: enrollments
        });
      }

      if(user.role === "STUDENT"){
        const stud = students.some((s)=>s.studentId===user.studentId);
        if(!stud){
          return res.status(400).json({
            success: false,
            message: "Student does not exist"
          })
        }

        const enrollment = enrollments.filter((e)=> e.studentId===user.studentId);
        return res.status(201).json({
          success:true,
          data: enrollment
        })
      }
    })
  }catch(err){
    return res.status(500).json({
      success:false,
      message: "something went wrong"
    })
  }
})

router.post('/',(req,res)=>{
  const authHeader = req.headers["authorization"];
  if(!authHeader || !authHeader.startsWith("Bearer ")){
      return res.status(401).json({
          success: false,
          message: "Authorization header is required"
      })
  }

  const token = authHeader.split(" ")[1];
  if(token === null){
    return res.status(401).json({
      success: false,
      message: "Token is required"
    })
  }

  try{
    const jwt_secret = process.env.JWT_SECRET || "this_is_my_secret";
    jwt.verify(token, jwt_secret, (err, payload)=>{
      if(err){
        return res.status(403).json({
          success: false,
          message: "Invalid or expired token"
        });
      }

      //find user by payload
      const user_payload = payload as UserPayload;
      const user = users.find((u)=> u.username===user_payload.username)
    
      if(!user){
        return res.status(403).json({
          success: false,
          message: "Unauthorized user"
        })
      }

      if(user.role === "ADMIN"){
        return res.status(403).json({
          success: false,
          message: "Only Student can access this API route"
        });
      }

      if(user.role === "STUDENT"){
        const body = req.body;
        const result = zEnrollmentBody.safeParse(body);

        if(!result.success){
          return res.status(400).json({
            message: "Validation failed",
            errors: result.error.issues[0]?.message,
          });
        }

        const { studentId,courseId } = result.data;
        const foundstu = students.find((s)=>s.studentId === studentId);
        const foundcourse = courses.find((c)=>c.courseId === courseId);

        const studentIndex = enrollments.findIndex((e)=> e.studentId===studentId);

        if(!foundstu || !foundcourse){
          return res.status(400).json({
            success: false,
            message: "Student or course does not exist"
          })
        }

        const alreadyEnrolled = enrollments.some((e) => e.studentId === studentId && e.courseId === courseId);
        if (alreadyEnrolled) {
          return res.status(409).json({
            success: false,
            message: "Already enrolled in this course"
          });
        }

        foundstu.courses?.push(courseId);
        enrollments.push({ studentId, courseId });

        return res.status(200).json({
          success: true,
          message: "Enrolled successfully",
          data: { studentId, courseId }
        });
      }
    })
  }catch(err){
    return res.status(500).json({
      success:false,
      message: "something went wrong",
      error: err
    })
  }
});

router.delete('/',(req,res)=>{
  const authHeader = req.headers["authorization"];
  if(!authHeader || !authHeader.startsWith("Bearer ")){
      return res.status(401).json({
          success: false,
          message: "Authorization header is required"
      })
  }

  const token = authHeader.split(" ")[1];
  if(token === null){
    return res.status(401).json({
      success: false,
      message: "Token is required"
    })
  }

  try{
    const jwt_secret = process.env.JWT_SECRET || "this_is_my_secret";
    jwt.verify(token, jwt_secret, (err, payload)=>{
      if(err){
        return res.status(403).json({
          success: false,
          message: "Invalid or expired token"
        });
      }

      //find user by payload
      const user_payload = payload as UserPayload;
      const user = users.find((u)=> u.username===user_payload.username)
    
      if(!user){
        return res.status(403).json({
          success: false,
          message: "Unauthorized user"
        })
      }

      if(user.role === "ADMIN"){
        return res.status(403).json({
          success: false,
          message: "Only Student can access this API route"
        });
      }

      if(user.role === "STUDENT"){
        const {courseNo} = req.body;
        const studentId = user.studentId;

        if(!courseNo){
          return res.status(400).json({
            success: false,
            message: "courseNo is required"
          });
        }

        const enrollmentIndex = enrollments.findIndex((e)=>e.studentId===studentId && e.courseId===courseNo);

        if(enrollmentIndex===-1){
          return res.status(404).json({
            success: false,
            message: "Enrollment not found"
          });
        }

        enrollments.splice(enrollmentIndex,1);

        const student = students.find((s)=>s.studentId===studentId);
        if(student) student.courses = student.courses?.filter((c)=> c !== courseNo);

        return res.status(200).json({
          success:true,
          message: "You has dropped from this course. See you next semester."
        });
      }
    })
  }catch(err){
    return res.status(500).json({
      success:false,
      message: "something went wrong"
    })
  }
});

export default router