import { GoogleGenAI, Type } from "@google/genai";

// Inicialización estándar siguiendo las mejores prácticas de seguridad
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeocodingFromGemini = async (locationName: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide the latitude and longitude coordinates for "${locationName}" in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
          required: ["lat", "lng"],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    if (data.lat && data.lng) return data;
    return null;
  } catch (error) {
    console.error("Error obteniendo coordenadas:", error);
    return null;
  }
};

export const suggestEmotionalNote = async (title: string, type: string, location: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Escribe una frase muy corta, romántica y emocional para una memoria compartida entre dos mujeres sobre una actividad de ${type} llamada "${title}" en ${location}. Usa un tono íntimo y femenino. Máximo 15 palabras.`,
    });
    return response.text?.trim() || "Un momento inolvidable juntas.";
  } catch (error) {
    console.error("Error sugiriendo nota:", error);
    return "Un día hermoso juntas.";
  }
};