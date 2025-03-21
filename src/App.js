import React, { useState, useRef, useCallback, useEffect } from "react";

const SCREEN_PLAYBACK_ID = "screen-playback";
const SCREEN_PLAYBACK_CANVAS_ID = "screen-playback-canvas";
const CAPTURE_INTERVAL = 20000;

export default function App() {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const captureIntervalRef = useRef(null);

  const startScreenCapture = useCallback(async () => {
    try {
      const videoElement = document.createElement("video");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen", displaySurface: "monitor" },
        selfBrowserSurface: "include",
      });

      videoElement.srcObject = screenStream;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.id = SCREEN_PLAYBACK_ID;
      document.body.appendChild(videoElement);

      videoElement.onloadedmetadata = () => {
        const canvasElement = document.createElement("canvas");
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        canvasElement.id = SCREEN_PLAYBACK_CANVAS_ID;
        document.body.appendChild(canvasElement);
      };

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      startScreenCaptureTimer();

      screenStream.getVideoTracks()[0].onended = stopScreenCapture;
    } catch (e) {
      console.error("Error starting screen capture", e);
    }
  }, []);

  const stopScreenCapture = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    document.getElementById(SCREEN_PLAYBACK_ID)?.remove();
    document.getElementById(SCREEN_PLAYBACK_CANVAS_ID)?.remove();
    setIsScreenSharing(false);
    stopScreenCaptureTimer();
  };

  const startScreenCaptureTimer = () => {
    captureIntervalRef.current = setInterval(async () => {
      const imgData = await getScreenImageData();
      if (imgData) saveImageLocally(imgData);
    }, CAPTURE_INTERVAL);
  };

  const stopScreenCaptureTimer = () => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
  };

  const _getImageDataFromTrack = async (videoTrack, videoElement, canvasEl) => {
    return new Promise((resolve, reject) => {
      if (videoElement) {
        let canvasElement = canvasEl || document.createElement("canvas");
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        const ctx = canvasElement.getContext("2d");
        ctx.drawImage(videoElement, 0, 0);
        resolve(canvasElement.toDataURL("image/jpeg", 0.8));
      } else {
        const newVideoElement = document.createElement("video");
        newVideoElement.srcObject = new MediaStream([videoTrack]);
        newVideoElement.autoplay = true;
        newVideoElement.onloadedmetadata = () => {
          const newCanvasElement = document.createElement("canvas");
          newCanvasElement.width = newVideoElement.videoWidth;
          newCanvasElement.height = newVideoElement.videoHeight;
          const ctx = newCanvasElement.getContext("2d");
          ctx.drawImage(newVideoElement, 0, 0);
          resolve(newCanvasElement.toDataURL("image/jpeg", 0.8));
        };
        newVideoElement.onerror = reject;
      }
    });
  };

  const getScreenImageData = async () => {
    try {
      return await _getImageDataFromTrack(
        screenStreamRef.current.getVideoTracks()[0],
        document.getElementById(SCREEN_PLAYBACK_ID),
        document.getElementById(SCREEN_PLAYBACK_CANVAS_ID)
      );
    } catch (e) {
      console.error("Error capturing screen image", e);
      return null;
    }
  };

  const saveImageLocally = (imgData) => {
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `screenshot_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Screen Capture App</h1>
      {isScreenSharing ? (
        <button onClick={stopScreenCapture}>Stop Screen Capture</button>
      ) : (
        <button onClick={startScreenCapture}>Start Screen Capture</button>
      )}
    </div>
  );
}
