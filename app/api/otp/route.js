// app/api/otp/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import User from '@/models/user.model';
import connectdb from '@/lib/mgdb';

let otpStore = {}; // Use Redis/DB in production

export async function POST(request) {
  try {
    await connectdb();
    const { email, action, otp } = await request.json();

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
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes
      };

      // ✅ FIXED - Port 587 + STARTTLS (most reliable for serverless)
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465/SSL, false for other ports
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // App Password ONLY
        },
        pool: true,
        maxConnections: 1,
        maxMessages: 5,
        connectionTimeout: 15000, // 15s
        greetingTimeout: 8000,
        socketTimeout: 15000,
        logger: false // Disable verbose logging
      });

      // Send email
      await transporter.sendMail({
        from: `"Your App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #333;">Your OTP Code</h2>
            <div style="background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 30px; font-size: 32px; text-align: center; 
                        letter-spacing: 8px; border-radius: 12px; font-weight: bold;">
              ${generatedOtp}
            </div>
            <p style="color: #666; margin-top: 20px;">
              This code expires in 5 minutes. Enter it to verify your email.
            </p>
          </div>
        `,
        text: `Your OTP code is: ${generatedOtp}. This code expires in 5 minutes.`
      });

      // Clean up old OTPs
      Object.keys(otpStore).forEach(key => {
        if (otpStore[key].expires < Date.now()) {
          delete otpStore[key];
        }
      });

      return NextResponse.json({ success: true, message: 'OTP sent successfully' });
    }

    if (action === 'verify') {
      const stored = otpStore[email];
      if (!stored || Date.now() > stored.expires) {
        return NextResponse.json({ success: false, message: 'OTP expired or not found' });
      }

      if (stored.otp === otp) {
        delete otpStore[email];
        return NextResponse.json({ success: true, message: 'Email verified successfully' });
      }

      return NextResponse.json({ success: false, message: 'Invalid OTP' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('OTP Error:', error);
    
    // More specific error handling
    if (error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { success: false, message: 'Email service temporarily unavailable. Try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
