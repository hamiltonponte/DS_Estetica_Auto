/**
 * Extract dominant colors from an image
 * @param {string} dataUrl - Image data URL
 * @param {number} colorCount - Number of colors to extract (default: 5)
 * @returns {Promise<string[]>} Array of hex colors
 */
export async function extractColorsFromImage(dataUrl, colorCount = 5) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize image for faster processing
        const maxSize = 100;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const colorMap = {};
        
        // Sample pixels (every 10th pixel for performance)
        for (let i = 0; i < pixels.length; i += 40) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          // Skip transparent or very light/dark pixels
          if (a < 128 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) {
            continue;
          }
          
          // Quantize colors to reduce variations
          const quantized = quantizeColor(r, g, b);
          const key = quantized.join(',');
          colorMap[key] = (colorMap[key] || 0) + 1;
        }
        
        // Sort by frequency and get top colors
        const sortedColors = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, colorCount * 2)
          .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return rgbToHex(r, g, b);
          });
        
        // Filter similar colors
        const uniqueColors = filterSimilarColors(sortedColors, colorCount);
        resolve(uniqueColors);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Quantize color values to reduce variations
 */
function quantizeColor(r, g, b) {
  const step = 32;
  return [
    Math.round(r / step) * step,
    Math.round(g / step) * step,
    Math.round(b / step) * step
  ];
}

/**
 * Convert RGB to Hex
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Filter similar colors to ensure variety
 */
function filterSimilarColors(colors, maxCount) {
  const result = [];
  
  for (const color of colors) {
    if (result.length >= maxCount) break;
    
    const isSimilar = result.some(existing => 
      colorDistance(color, existing) < 50
    );
    
    if (!isSimilar) {
      result.push(color);
    }
  }
  
  // If we don't have enough colors, add some defaults
  while (result.length < maxCount) {
    const defaults = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    for (const defaultColor of defaults) {
      if (result.length >= maxCount) break;
      if (!result.includes(defaultColor)) {
        result.push(defaultColor);
      }
    }
  }
  
  return result;
}

/**
 * Calculate color distance (Euclidean)
 */
function colorDistance(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

/**
 * Convert Hex to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Gera 3 paletas para o tema escuro do PWA a partir das cores da logo.
 * @param {string[]} colors - Array de hex colors
 * @returns {Object[]} Array de theme options
 */
export function generateThemeOptions(colors) {
  const c1 = colors[0] || '#E63946';
  const c2 = colors[1] || '#A8A8A8';
  const c3 = colors[2] || '#C0C0C0';

  return [
    {
      id: 'classico',
      name: 'Clássico',
      description: 'Destaque na cor principal da logo',
      colors: {
        accent: c1,
        primary: c1,
        secondary: c2,
      },
    },
    {
      id: 'vibrante',
      name: 'Vibrante',
      description: 'Contraste mais forte entre as cores',
      colors: {
        accent: c2,
        primary: c1,
        secondary: c3,
      },
    },
    {
      id: 'suave',
      name: 'Suave',
      description: 'Tons mais claros e harmoniosos',
      colors: {
        accent: lightenColor(c1, 12),
        primary: lightenColor(c1, 8),
        secondary: c3,
      },
    },
  ];
}

/**
 * Lighten a color by percentage
 */
function lightenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  const amount = Math.round(2.55 * percent);
  
  return rgbToHex(
    Math.min(255, rgb.r + amount),
    Math.min(255, rgb.g + amount),
    Math.min(255, rgb.b + amount)
  );
}
