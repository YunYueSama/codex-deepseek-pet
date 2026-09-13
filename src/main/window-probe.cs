using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class WhaleForeground {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
 public class Window { public string handle; public int pid,x,y,width,height; }
 public delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out Rect r);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb,IntPtr p);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h,int index);
 [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int key,out int value,int size);
 [DllImport("dwmapi.dll",EntryPoint="DwmGetWindowAttribute")] static extern int DwmRect(IntPtr h,int key,out Rect value,int size);
 public static Window Read(IntPtr h){Rect r;if(DwmRect(h,9,out r,16)!=0)GetWindowRect(h,out r);uint pid;GetWindowThreadProcessId(h,out pid);return new Window{handle=h.ToInt64().ToString(),pid=(int)pid,x=r.Left,y=r.Top,width=r.Right-r.Left,height=r.Bottom-r.Top};}
 public static Window[] Visible(){var list=new List<Window>();EnumWindows((h,p)=>{int cloaked;DwmGetWindowAttribute(h,14,out cloaked,4);
 if(IsWindowVisible(h)&&!IsIconic(h)&&cloaked==0&&(GetWindowLong(h,-20)&0x80)==0){var w=Read(h);if(w.width>=80&&w.height>=50)list.Add(w);}return list.Count<64;},IntPtr.Zero);return list.ToArray();}
}
