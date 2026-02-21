import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pen, RotateCcw, CheckCircle2 } from "lucide-react";

export default function SignatureDialog({ open, onConfirm, onCancel, driverName }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPos = useRef(null);

  useEffect(() => {
    if (open) setHasSignature(false);
  }, [open]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  };

  const stopDraw = (e) => {
    e?.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    onConfirm(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-4 h-4" /> Driver Signature
          </DialogTitle>
          <DialogDescription>
            {driverName
              ? `${driverName} — please sign below to confirm this weekly record is accurate.`
              : "Please sign below to confirm this weekly record is accurate."}
          </DialogDescription>
        </DialogHeader>

        {/* Signature pad */}
        <div className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white relative"
             style={{ touchAction: "none" }}>
          <canvas
            ref={canvasRef}
            width={460}
            height={160}
            className="w-full h-40 cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-300 text-sm font-medium select-none">Sign here</span>
            </div>
          )}
          {/* Baseline */}
          <div className="absolute bottom-8 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none" />
        </div>

        <div className="flex items-center justify-between mt-1">
          <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-slate-500 gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!hasSignature}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirm &amp; Complete
            </Button>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center -mt-1">
          By signing, the driver confirms this record is true and correct — WA Heavy Vehicle National Law
        </p>
      </DialogContent>
    </Dialog>
  );
}