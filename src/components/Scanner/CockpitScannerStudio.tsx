"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  QrCode,
  FileText,
  Flashlight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plane,
  Fuel,
  Upload,
  ArrowRight,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Zap,
  Scan,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { useCrewStore } from "../../store/useCrewStore";
import { AircraftScanResult, FmsOooiScanResult, LogbookEntry } from "../../types";
import {
  parseAircraftPlacard,
  parseAircraftQrPayload,
  parseFmsOooiScreen,
  formatMinutesToHoursMinutes,
} from "../../lib/scannerEngine";

export interface QrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  tailNumber?: string;
  noseNumber?: string;
  aircraftType?: string;
  rawPayload: string;
  timestamp: number;
}

export default function CockpitScannerStudio() {
  const [scanMode, setScanMode] = useState<"QR_PLACARD" | "FMS_OOOI">("QR_PLACARD");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedToLogbook, setSavedToLogbook] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Scanned results state
  const [aircraftResult, setAircraftResult] = useState<AircraftScanResult | null>(null);
  const [fmsResult, setFmsResult] = useState<FmsOooiScanResult | null>(null);
  const [activeQrBox, setActiveQrBox] = useState<QrBoundingBox | null>(null);

  // Editable Form fields (INITIALIZED BLANK per user directive)
  const [flightNumber, setFlightNumber] = useState<string>("");
  const [tailNumber, setTailNumber] = useState<string>("");
  const [noseNumber, setNoseNumber] = useState<string>("");
  const [aircraftType, setAircraftType] = useState<string>("");
  const [depAirport, setDepAirport] = useState<string>("");
  const [arrAirport, setArrAirport] = useState<string>("");
  const [outTime, setOutTime] = useState<string>("");
  const [offTime, setOffTime] = useState<string>("");
  const [onTime, setOnTime] = useState<string>("");
  const [inTime, setInTime] = useState<string>("");
  const [outFuel, setOutFuel] = useState<string>("");
  const [inFuel, setInFuel] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isScanningFrameRef = useRef<boolean>(false);
  const lastVibrateRef = useRef<number>(0);
  const barcodeDetectorRef = useRef<any>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const addLogbookEntry = useCrewStore((state) => state.addLogbookEntry);

  // Clear all scanned fields
  const handleClearFields = () => {
    setFlightNumber("");
    setTailNumber("");
    setNoseNumber("");
    setAircraftType("");
    setDepAirport("");
    setArrAirport("");
    setOutTime("");
    setOffTime("");
    setOnTime("");
    setInTime("");
    setOutFuel("");
    setInFuel("");
    setAircraftResult(null);
    setFmsResult(null);
    setActiveQrBox(null);
    setScanSuccessMessage(null);
  };

  // Start Camera Stream
  const startCamera = useCallback(async (desiredFacing: "environment" | "user" = facingMode) => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: desiredFacing },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });
      } catch (err1) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("autoplay", "true");
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.setAttribute("muted", "true");
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play error:", playErr);
        }
      }

      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Camera stream unavailable. Tap restart or upload a cockpit photo below.");
      setCameraActive(false);
    }
  }, [facingMode]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Toggle Camera Facing Mode (Front / Back)
  const toggleFacing = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Toggle Flashlight / Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && "applyConstraints" in track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn("Torch not supported on this device/camera.");
      }
    }
  };

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Capture current video frame as an image canvas URL
  const captureVideoFrame = (): string | null => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.95);
  };

  // Helper: Live QR Detection Handler
  const handleLiveQrDetected = (
    rawPayload: string,
    box: { x: number; y: number; width: number; height: number }
  ) => {
    const parsed = parseAircraftQrPayload(rawPayload);
    setActiveQrBox({
      x: Math.max(2, Math.min(88, box.x)),
      y: Math.max(2, Math.min(88, box.y)),
      width: Math.max(8, Math.min(92, box.width)),
      height: Math.max(8, Math.min(92, box.height)),
      tailNumber: parsed.tailNumber,
      noseNumber: parsed.noseNumber,
      aircraftType: parsed.aircraftType,
      rawPayload,
      timestamp: Date.now(),
    });

    if (parsed.tailNumber || parsed.noseNumber) {
      setAircraftResult(parsed);
      if (parsed.tailNumber) setTailNumber(parsed.tailNumber);
      if (parsed.noseNumber) setNoseNumber(parsed.noseNumber);
      if (parsed.aircraftType) setAircraftType(parsed.aircraftType);

      // Trigger phone haptic vibration (throttled once per 2.5s)
      const now = Date.now();
      if (now - lastVibrateRef.current > 2500) {
        lastVibrateRef.current = now;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate([45, 30, 45]);
          } catch (e) {}
        }
      }

      setScanSuccessMessage(`Identified Tail: ${parsed.tailNumber || "QR Aircraft"} (#${parsed.noseNumber || ""})`);
      setTimeout(() => setScanSuccessMessage(null), 3500);
    }
  };

  // Continuous frame scanner for QR placard mode (Full-frame hardware accelerated + camera bounding box tracking)
  useEffect(() => {
    if (!cameraActive || scanMode !== "QR_PLACARD") return;

    let isScanning = false;
    const interval = setInterval(async () => {
      if (isScanning || !videoRef.current || videoRef.current.readyState < 2) return;
      isScanning = true;

      try {
        const video = videoRef.current;
        const vw = video.videoWidth || 1280;
        const vh = video.videoHeight || 720;

        // Downscale to max 640 for lightweight 60fps frame scanning without lag or memory leaks
        const targetWidth = Math.min(vw, 640);
        const targetHeight = Math.round(targetWidth * (vh / vw));

        if (!scanCanvasRef.current) {
          scanCanvasRef.current = document.createElement("canvas");
        }
        const canvas = scanCanvasRef.current;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          isScanning = false;
          return;
        }

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        let detected = false;

        // 1. Hardware-accelerated native BarcodeDetector (Chrome / Android / Capacitor WebView)
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          try {
            if (!barcodeDetectorRef.current) {
              barcodeDetectorRef.current = new (window as any).BarcodeDetector({
                formats: ["qr_code", "data_matrix", "aztec", "pdf417"],
              });
            }
            const barcodes = await barcodeDetectorRef.current.detect(canvas);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const bc = barcodes[0];
              let bx = 0,
                by = 0,
                bw = 0,
                bh = 0;
              if (bc.boundingBox) {
                bx = (bc.boundingBox.x / canvas.width) * 100;
                by = (bc.boundingBox.y / canvas.height) * 100;
                bw = (bc.boundingBox.width / canvas.width) * 100;
                bh = (bc.boundingBox.height / canvas.height) * 100;
              } else if (bc.cornerPoints && bc.cornerPoints.length >= 4) {
                const xs = bc.cornerPoints.map((p: any) => p.x);
                const ys = bc.cornerPoints.map((p: any) => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                bx = (minX / canvas.width) * 100;
                by = (minY / canvas.height) * 100;
                bw = ((maxX - minX) / canvas.width) * 100;
                bh = ((maxY - minY) / canvas.height) * 100;
              }
              handleLiveQrDetected(bc.rawValue, { x: bx, y: by, width: bw, height: bh });
              detected = true;
            }
          } catch (e) {}
        }

        // 2. Pure JS fallback via jsQR
        if (!detected) {
          try {
            const { default: jsQR } = await import("jsqr");
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: "attemptBoth",
            });

            if (code && code.data && code.data.trim().length > 0) {
              const loc = code.location;
              const minX = Math.min(loc.topLeftCorner.x, loc.bottomLeftCorner.x);
              const maxX = Math.max(loc.topRightCorner.x, loc.bottomRightCorner.x);
              const minY = Math.min(loc.topLeftCorner.y, loc.topRightCorner.y);
              const maxY = Math.max(loc.bottomLeftCorner.y, loc.bottomRightCorner.y);
              const bx = (minX / canvas.width) * 100;
              const by = (minY / canvas.height) * 100;
              const bw = ((maxX - minX) / canvas.width) * 100;
              const bh = ((maxY - minY) / canvas.height) * 100;

              handleLiveQrDetected(code.data.trim(), { x: bx, y: by, width: bw, height: bh });
              detected = true;
            }
          } catch (qrErr) {}
        }

        if (!detected && activeQrBox && Date.now() - activeQrBox.timestamp > 1400) {
          setActiveQrBox(null);
        }
      } catch (err) {
      } finally {
        isScanning = false;
      }
    }, 180);

    return () => clearInterval(interval);
  }, [cameraActive, scanMode, activeQrBox]);

  // Helper: Rotate image 90 degrees clockwise on a canvas
  const rotateCanvas90 = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const rotated = document.createElement("canvas");
    rotated.width = sourceCanvas.height;
    rotated.height = sourceCanvas.width;
    const ctx = rotated.getContext("2d");
    if (ctx) {
      ctx.translate(rotated.width / 2, rotated.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    }
    return rotated;
  };

  // Process image data (from snapshot or file upload)
  const processImageUrl = async (imgUrl: string) => {
    setIsProcessing(true);
    setScanSuccessMessage(null);
    setProcessingStatus("Analyzing image...");

    try {
      if (scanMode === "QR_PLACARD") {
        setProcessingStatus("Reading aircraft QR code...");

        // Load image onto canvas
        const img = new Image();
        img.src = imgUrl;
        await new Promise((res) => {
          img.onload = res;
        });

        // Base canvas (downscaled to max 1200 for optimal processing)
        const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = Math.floor(img.width * scale);
        baseCanvas.height = Math.floor(img.height * scale);
        const baseCtx = baseCanvas.getContext("2d");
        if (baseCtx) baseCtx.drawImage(img, 0, 0, baseCanvas.width, baseCanvas.height);

        let decodedData = "";

        // 1. Try Native BarcodeDetector across 4 rotations
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ["qr_code", "data_matrix", "aztec", "pdf417"],
            });
            let testCanvas = baseCanvas;
            for (let r = 0; r < 4; r++) {
              const barcodes = await detector.detect(testCanvas);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                decodedData = barcodes[0].rawValue;
                break;
              }
              testCanvas = rotateCanvas90(testCanvas);
            }
          } catch (e) {}
        }

        // 2. Try jsQR across 4 rotations
        if (!decodedData) {
          try {
            const { default: jsQR } = await import("jsqr");
            let testCanvas = baseCanvas;
            for (let r = 0; r < 4; r++) {
              const tCtx = testCanvas.getContext("2d");
              if (tCtx) {
                const imgData = tCtx.getImageData(0, 0, testCanvas.width, testCanvas.height);
                const code = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: "attemptBoth",
                });
                if (code && code.data && code.data.trim().length > 0) {
                  decodedData = code.data.trim();
                  break;
                }
              }
              testCanvas = rotateCanvas90(testCanvas);
            }
          } catch (e) {}
        }

        if (decodedData) {
          const parsed = parseAircraftQrPayload(decodedData);
          setAircraftResult(parsed);
          if (parsed.tailNumber) setTailNumber(parsed.tailNumber);
          if (parsed.noseNumber) setNoseNumber(parsed.noseNumber);
          if (parsed.aircraftType) setAircraftType(parsed.aircraftType);

          if (parsed.tailNumber || parsed.noseNumber) {
            setScanSuccessMessage(
              `Identified Tail: ${parsed.tailNumber || "QR Aircraft"} (#${parsed.noseNumber || ""})`
            );
          } else {
            setScanSuccessMessage(`Decoded QR: ${decodedData.substring(0, 25)}`);
          }
        } else {
          setCameraError("No QR code detected in this photo. Please center the QR code and try again.");
        }
      } else {
        // FMS OOOI OCR with multi-orientation analysis (0 and 90 degrees)
        setProcessingStatus("Extracting FMS OOOI Timestamps & Airports...");

        const img = new Image();
        img.src = imgUrl;
        await new Promise((res) => {
          img.onload = res;
        });

        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = Math.floor(img.width * scale);
        baseCanvas.height = Math.floor(img.height * scale);
        const baseCtx = baseCanvas.getContext("2d");
        if (baseCtx) baseCtx.drawImage(img, 0, 0, baseCanvas.width, baseCanvas.height);

        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");

        // Try 0 deg rotation
        const ret0 = await worker.recognize(baseCanvas.toDataURL("image/jpeg", 0.9));
        let parsed = parseFmsOooiScreen(ret0.data.text);

        // If confidence is low or times/airports are missing, try 90 deg rotation (portrait photo of landscape screen)
        if (parsed.confidence < 70 || !parsed.outTime || !parsed.inTime) {
          setProcessingStatus("Analyzing rotated FMS screen angle...");
          const rot90Canvas = rotateCanvas90(baseCanvas);
          const ret90 = await worker.recognize(rot90Canvas.toDataURL("image/jpeg", 0.9));
          const parsed90 = parseFmsOooiScreen(ret90.data.text);
          if (parsed90.confidence >= parsed.confidence) {
            parsed = parsed90;
          }
        }

        await worker.terminate();

        setFmsResult(parsed);
        if (parsed.flightNumber) setFlightNumber(parsed.flightNumber);
        if (parsed.depAirport) setDepAirport(parsed.depAirport);
        if (parsed.arrAirport) setArrAirport(parsed.arrAirport);
        if (parsed.outTime) setOutTime(parsed.outTime);
        if (parsed.offTime) setOffTime(parsed.offTime);
        if (parsed.onTime) setOnTime(parsed.onTime);
        if (parsed.inTime) setInTime(parsed.inTime);
        if (parsed.outFuel) setOutFuel(parsed.outFuel.toString());
        if (parsed.inFuel) setInFuel(parsed.inFuel.toString());
        setScanSuccessMessage(
          `Extracted OOOI: ${parsed.depAirport || "Origin"} -> ${parsed.arrAirport || "Dest"} (OUT ${parsed.outTime} / IN ${parsed.inTime})`
        );
      }
      setTimeout(() => setScanSuccessMessage(null), 5000);
    } catch (e: any) {
      console.error("Scan error:", e);
      setCameraError("Scan processing failed. Please try snapping again or entering manually.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Capture Live Camera Frame & Process
  const handleSnapLiveFrame = async () => {
    const frameData = captureVideoFrame();
    if (frameData) {
      await processImageUrl(frameData);
    } else {
      setCameraError("No active video feed to capture. Please ensure camera is running.");
    }
  };

  // Handle Photo File Upload
  const handleFileUpload = async (file: File) => {
    const imgUrl = URL.createObjectURL(file);
    await processImageUrl(imgUrl);
  };

  // Calculate Metrics from current inputs
  const parseMins = (t: string) => {
    const clean = t.replace(/[^0-9]/g, "");
    if (clean.length === 4) {
      return parseInt(clean.substring(0, 2), 10) * 60 + parseInt(clean.substring(2, 4), 10);
    }
    return null;
  };

  const outM = parseMins(outTime);
  const inM = parseMins(inTime);
  const offM = parseMins(offTime);
  const onM = parseMins(onTime);

  let calcBlockMins = 0;
  if (outM !== null && inM !== null) {
    calcBlockMins = inM >= outM ? inM - outM : (1440 - outM) + inM;
  }

  let calcFlightMins = 0;
  if (offM !== null && onM !== null) {
    calcFlightMins = onM >= offM ? onM - offM : (1440 - offM) + onM;
  }

  const outFuelNum = parseFloat(outFuel) || 0;
  const inFuelNum = parseFloat(inFuel) || 0;
  const fuelBurn = outFuelNum > inFuelNum ? (outFuelNum - inFuelNum).toFixed(1) : "0.0";

  // Save Scanned Entry to Logbook
  const handleSaveToLogbook = () => {
    const today = new Date().toISOString().split("T")[0];
    const newEntry: LogbookEntry = {
      id: `log-scan-${Date.now()}`,
      date: today,
      flightNumber: (flightNumber || "AA100").toUpperCase(),
      tailNumber: (tailNumber || "N000AA").toUpperCase(),
      noseNumber: noseNumber || undefined,
      aircraftType: (aircraftType || "E75").toUpperCase(),
      depAirport: (depAirport || "ORD").toUpperCase(),
      arrAirport: (arrAirport || "DFW").toUpperCase(),
      outTime: outTime.replace(":", "") || "0000",
      offTime: offTime.replace(":", "") || undefined,
      onTime: onTime.replace(":", "") || undefined,
      inTime: inTime.replace(":", "") || "0000",
      blockMinutes: calcBlockMins || 120,
      flightMinutes: calcFlightMins || 100,
      nightMinutes: 0,
      instrumentMinutes: 0,
      crossCountryMinutes: calcBlockMins || 120,
      picMinutes: calcBlockMins || 120,
      sicMinutes: 0,
      dualReceivedMinutes: 0,
      landingsDay: 1,
      landingsNight: 0,
      approaches: 0,
      outFuel: outFuelNum,
      offFuel: 13.9,
      onFuel: 6.5,
      inFuel: inFuelNum,
      remarks: `Scanned via Cockpit Scanner (OOOI: ${outTime || "00:00"}-${inTime || "00:00"} | Burn: ${fuelBurn}k lbs)`,
      sourceScanType: scanMode,
      isAutoFilled: false,
      createdAt: new Date().toISOString(),
    };

    addLogbookEntry(newEntry);
    setSavedToLogbook(true);
    setTimeout(() => setSavedToLogbook(false), 3000);
  };

  // Copy Summary text
  const handleCopySummary = () => {
    const summary = `FLT ${flightNumber} | ${depAirport}->${arrAirport}\nTAIL: ${tailNumber} (#${noseNumber}) ${aircraftType}\nOUT: ${outTime} | OFF: ${offTime} | ON: ${onTime} | IN: ${inTime}\nBLOCK: ${formatMinutesToHoursMinutes(calcBlockMins)} | FLT: ${formatMinutesToHoursMinutes(calcFlightMins)} | BURN: ${fuelBurn}k lbs`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Hidden file input for native camera snapping & uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewfinder Card Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Cockpit Scanner</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  Live Vision
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Scan aircraft tail placard QR & FMS OOOI screen
              </p>
            </div>
          </div>

          {/* Camera Viewfinder Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-xl border transition cursor-pointer active-press ${
                torchOn
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_#f59e0b]"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
              title="Toggle Flashlight"
            >
              <Flashlight className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFacing}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white transition cursor-pointer active-press"
              title="Flip Camera"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={cameraActive ? stopCamera : () => startCamera()}
              className={`p-2 rounded-xl border transition cursor-pointer active-press ${
                cameraActive
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
              title="Start / Stop Camera"
            >
              <RefreshCw className={`w-4 h-4 ${cameraActive ? "" : "animate-spin"}`} />
            </button>
          </div>
        </div>

        {/* Mode Selector Switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            onClick={() => setScanMode("QR_PLACARD")}
            className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active-press ${
              scanMode === "QR_PLACARD"
                ? "bg-sky-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Aircraft QR Code</span>
          </button>
          <button
            onClick={() => setScanMode("FMS_OOOI")}
            className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active-press ${
              scanMode === "FMS_OOOI"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>FMS OOOI Screen</span>
          </button>
        </div>
      </div>

      {/* Live Viewfinder Frame (Always Mounted) */}
      <div className="relative w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? "opacity-100" : "opacity-20"
          }`}
        />

        {/* If camera is not active or has error */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-3 bg-slate-950/80 backdrop-blur-xs">
            <Camera className="w-12 h-12 text-slate-600 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-slate-200">Camera Stream Offline</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-[260px]">
                {cameraError || "Tap Start Camera to begin scanning in real-time."}
              </p>
            </div>
            <button
              onClick={() => startCamera()}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer active-press flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Start Camera</span>
            </button>
          </div>
        )}

        {/* Viewfinder Target Reticle Overlay */}
        <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-sky-400/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
          <div className="flex justify-between items-start">
            <div className="w-5 h-5 border-t-2 border-l-2 border-sky-400" />
            <span className="text-[9.5px] font-mono font-bold tracking-wider px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-sky-300 uppercase border border-sky-500/20">
              {scanMode === "QR_PLACARD" ? "ALIGN AIRCRAFT QR CODE" : "ALIGN FMS AOC OOOI SCREEN"}
            </span>
            <div className="w-5 h-5 border-t-2 border-r-2 border-sky-400" />
          </div>

          {/* Animated Scanning Line */}
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-pulse" />

          <div className="flex justify-between items-end">
            <div className="w-5 h-5 border-b-2 border-l-2 border-sky-400" />
            <span className="text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
              {scanMode === "QR_PLACARD" ? "Live QR Scanner Active..." : "Point at MCDU & Tap Capture"}
            </span>
            <div className="w-5 h-5 border-b-2 border-r-2 border-sky-400" />
          </div>
        </div>

        {/* Native Camera-Style QR Code Bounding Box Overlay */}
        {scanMode === "QR_PLACARD" && activeQrBox && Date.now() - activeQrBox.timestamp < 1600 && (
          <div
            className="absolute pointer-events-none transition-all duration-150 ease-out z-20"
            style={{
              left: `${Math.max(2, Math.min(86, activeQrBox.x))}%`,
              top: `${Math.max(2, Math.min(86, activeQrBox.y))}%`,
              width: `${Math.max(10, Math.min(92, activeQrBox.width))}%`,
              height: `${Math.max(10, Math.min(92, activeQrBox.height))}%`,
            }}
          >
            {/* Glowing Box Frame with Pulsing Animation */}
            <div className="w-full h-full border-2 border-emerald-400 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.9),inset_0_0_15px_rgba(52,211,153,0.3)] bg-emerald-400/10 relative animate-pulse">
              {/* 4 Precision L-Corner Brackets */}
              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-3 border-l-3 border-emerald-300 rounded-tl" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-3 border-r-3 border-emerald-300 rounded-tr" />
              <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-3 border-l-3 border-emerald-300 rounded-bl" />
              <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-3 border-r-3 border-emerald-300 rounded-br" />

              {/* Floating Tail Number Pill */}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-emerald-600/95 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-2xl border border-emerald-300 flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md">
                <Plane className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="tracking-wider">{activeQrBox.tailNumber || "QR DETECTED"}</span>
                {activeQrBox.noseNumber && (
                  <span className="bg-emerald-800/80 px-1.5 py-0.5 rounded text-[9.5px] font-mono">
                    #{activeQrBox.noseNumber}
                  </span>
                )}
                {activeQrBox.aircraftType && (
                  <span className="text-emerald-200 text-[10px]">
                    ({activeQrBox.aircraftType})
                  </span>
                )}
                <CheckCircle className="w-3 h-3 text-emerald-200 shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Instant Scan Success Flash Message */}
        {scanSuccessMessage && (
          <div className="absolute top-4 left-4 right-4 bg-emerald-600/95 backdrop-blur-md text-white py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-lg border border-emerald-400/50 animate-bounce z-10">
            <CheckCircle className="w-4 h-4 text-white shrink-0" />
            <span className="text-xs font-black tracking-wide truncate">{scanSuccessMessage}</span>
          </div>
        )}

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2.5 z-20">
            <RefreshCw className="w-9 h-9 text-sky-400 animate-spin" />
            <p className="text-xs font-black tracking-wide text-sky-200 uppercase">
              {processingStatus || "Processing Scan..."}
            </p>
          </div>
        )}
      </div>

      {/* Direct Capture Action Bar */}
      <div className="flex gap-2">
        <button
          onClick={handleSnapLiveFrame}
          disabled={!cameraActive || isProcessing}
          className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 cursor-pointer active-press"
        >
          <Scan className="w-4 h-4" />
          <span>{scanMode === "QR_PLACARD" ? "Scan Live QR Frame" : "📸 Capture & Scan FMS Screen"}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-2xl transition cursor-pointer active-press shrink-0 flex items-center justify-center"
          title="Take Photo with Native Camera or Upload"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      {/* Scanned Flight Parameters Confirmation Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-black text-slate-900">Scanned Flight Parameters</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearFields}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200 flex items-center gap-1 cursor-pointer active-press"
              title="Clear all fields"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Ready for Logbook</span>
            </span>
          </div>
        </div>

        {/* Aircraft Placard Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                Aircraft Tail
              </label>
              <input
                type="text"
                value={tailNumber}
                onChange={(e) => setTailNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                placeholder="-- blank --"
              />
            </div>
            <div>
              <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                Nose / Ship #
              </label>
              <input
                type="text"
                value={noseNumber}
                onChange={(e) => setNoseNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                placeholder="-- blank --"
              />
            </div>
            <div>
              <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                Type
              </label>
              <input
                type="text"
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                placeholder="-- blank --"
              />
            </div>
          </div>
        </div>

        {/* Flight & Station Details */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">
              Flight #
            </label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
              placeholder="-- blank --"
            />
          </div>
          <div>
            <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">
              Origin
            </label>
            <input
              type="text"
              value={depAirport}
              onChange={(e) => setDepAirport(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
              placeholder="-- blank --"
            />
          </div>
          <div>
            <label className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">
              Dest
            </label>
            <input
              type="text"
              value={arrAirport}
              onChange={(e) => setArrAirport(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
              placeholder="-- blank --"
            />
          </div>
        </div>

        {/* OOOI Timestamps Grid */}
        <div className="space-y-1.5">
          <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider block">
            OOOI Timestamps (HH:MM)
          </span>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
              <span className="text-[9px] font-bold text-slate-500 block mb-0.5">OUT (Gate)</span>
              <input
                type="text"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-1 text-center text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-sky-600"
                placeholder="--:--"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
              <span className="text-[9px] font-bold text-slate-500 block mb-0.5">OFF (Takeoff)</span>
              <input
                type="text"
                value={offTime}
                onChange={(e) => setOffTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-1 text-center text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-sky-600"
                placeholder="--:--"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
              <span className="text-[9px] font-bold text-slate-500 block mb-0.5">ON (Touchdown)</span>
              <input
                type="text"
                value={onTime}
                onChange={(e) => setOnTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-1 text-center text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-sky-600"
                placeholder="--:--"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
              <span className="text-[9px] font-bold text-slate-500 block mb-0.5">IN (Gate)</span>
              <input
                type="text"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-1 text-center text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-sky-600"
                placeholder="--:--"
              />
            </div>
          </div>
        </div>

        {/* Computed Flight Statistics Summary */}
        <div className="grid grid-cols-3 gap-2 bg-sky-50/50 border border-sky-100 rounded-2xl p-3">
          <div className="text-center">
            <span className="text-[9.5px] font-bold uppercase text-sky-800 tracking-wider block">Block Time</span>
            <p className="text-sm font-black text-sky-950 font-mono mt-0.5">
              {calcBlockMins > 0 ? formatMinutesToHoursMinutes(calcBlockMins) : "--"}
            </p>
          </div>
          <div className="text-center border-x border-sky-200">
            <span className="text-[9.5px] font-bold uppercase text-sky-800 tracking-wider block">Flight Time</span>
            <p className="text-sm font-black text-sky-950 font-mono mt-0.5">
              {calcFlightMins > 0 ? formatMinutesToHoursMinutes(calcFlightMins) : "--"}
            </p>
          </div>
          <div className="text-center">
            <span className="text-[9.5px] font-bold uppercase text-sky-800 tracking-wider block">Fuel Burn</span>
            <p className="text-sm font-black text-sky-950 font-mono mt-0.5">
              {parseFloat(fuelBurn) > 0 ? `${fuelBurn}k lbs` : "--"}
            </p>
          </div>
        </div>

        {/* Action Buttons: Save to Logbook & Copy */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSaveToLogbook}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active-press shadow-md ${
              savedToLogbook
                ? "bg-emerald-600 text-white shadow-emerald-600/20"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
            }`}
          >
            {savedToLogbook ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved to Logbook!</span>
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                <span>Save to Pilot Logbook</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopySummary}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-2xl transition cursor-pointer active-press shrink-0 flex items-center justify-center"
            title="Copy Flight Summary"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
