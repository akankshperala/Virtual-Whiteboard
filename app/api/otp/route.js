// app/api/otp/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import User from '@/models/user.model';
import connectdb from '@/lib/mgdb';

let otpStore = {}; // Use Redis/DB in prod

export async function POST(request) {
  try {
    await connectdb();
    const { email, action, otp } = await request.json(); // ✅ Destructure otp here

    if (action === 'send') {
      // Check existing user
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'Email already registered' },
          { status: 400 }
        );
      }

      // Generate OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[email] = { 
        otp: generatedOtp, 
        expires: Date.now() + 5 * 60 * 1000 
      };

      // Nodemailer setup
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.sendMail({
        from: `"Your App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px;">
            <h2>Your OTP Code</h2>
            <div style="background: #f0f0f0; padding: 20px; font-size: 24px; text-align: center; letter-spacing: 5px;">
              ${generatedOtp}
            </div>
            <p>This code expires in 5 minutes.</p>
          </div>
        `,
      });

      return NextResponse.json({ success: true, message: 'OTP sent successfully' });
    }

    if (action === 'verify') {
      const stored = otpStore[email];
      if (!stored || Date.now() > stored.expires) {
        return NextResponse.json({ success: false, message: 'OTP expired or not found' });
      }

      if (stored.otp === otp) { // ✅ Now otp is defined
        delete otpStore[email];
        return NextResponse.json({ success: true, message: 'OTP verified' });
      }

      return NextResponse.json({ success: false, message: 'Invalid OTP' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('OTP Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
