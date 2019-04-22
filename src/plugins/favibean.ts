import Vue from 'vue';

declare module 'vue/types/vue' {
  interface Vue {
    $updateFaviconBadge: (badgeContent: string | number) => void;
  }
}

interface BadgePluginOptions {
  bgColor?: string;
  fgColor?: string;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic' | 'oblique' | 'bold';
  textAlign?: 'center' | 'left' | 'right' | 'justify';
  position?: 'up' | 'down';
};

interface BadgeRenderOptions {
  content: string | number;
  width: number;
  height: number;
  x: number;
  y: number;
};

type TransformMap = {
  [K in BadgePluginOptions['position']]: (x: number, y: number, width: number, height: number) => {
    transformX: number,
    transformY: number
  }
};

const defaultOptions: BadgePluginOptions = {
  bgColor: '#32ff99',
  fgColor: '#000',
  fontFamily: 'Arial',
  fontStyle: 'bold',
  textAlign: 'center',
  position: 'up',
};

const positionTransform: TransformMap = {
  up: (x, _, width, height) => ({ transformX: x + width / 2, transformY: height / 2}),
  down: (x, y, width, height) => ({ transformX: x + width / 2, transformY: y + height / 2})
};

const isIcon = (input: string) => /(^|\s)icon(\s|$)/i.test(input);
const MAX_STRING_LEN = 2;

const resolveExistingFavicons = () => {
  const head = document.getElementsByTagName('head')[0];
  return Array.from(head.getElementsByTagName('link'))
    .filter(le => isIcon(le.getAttribute('rel'))
  );
};

export function FaviconBadgePlugin(VuePrototype: typeof Vue, pluginOptions?: BadgePluginOptions) {
  const options = {
    ...defaultOptions,
    ...(pluginOptions || {}),
  };

  const availableFavicons = resolveExistingFavicons();
  const lastFavicon = availableFavicons[availableFavicons.length - 1];
  const canvas = document.createElement('canvas');
  const baseImage = document.createElement('img');

  const href = lastFavicon.getAttribute('href');

  const renderingContext = canvas.getContext('2d');
 
  const maybeGenerateBadge = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, renderOptions: BadgeRenderOptions) => {
    const {
      content,
      height,
      width,
      x,
      y
    } = renderOptions;
  
    const {
      bgColor,
      fgColor,
      fontStyle,
      fontFamily,
      textAlign,
    } = options;

    if (!content) {
      return;
    }
  
    const renderedContent = '' + content;
    
    const {
      transformX,
      transformY
    } = positionTransform[options.position](x, y, width, height);

    ctx.arc(transformX, transformY, height / 2, 0, 2 * Math.PI);
    ctx.fillStyle = bgColor;
    ctx.fill();
    
    ctx.fillStyle = fgColor;
  
    const scalingFactor = renderedContent.length > MAX_STRING_LEN ? .66 : .85;
  
    const fontSize = Math.floor(height * scalingFactor);

    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
  
    ctx.fillText(
      renderedContent,
      transformX,
      transformY + height * .25
    );
  };

  const resolveAfterLoad = (content: string | number) => {
    const { height, width } = baseImage;

    canvas.height = height;
    canvas.width = width;
  
    renderingContext.clearRect(0, 0, width, height);
    renderingContext.drawImage(baseImage, 0, 0, width, height);
    
    maybeGenerateBadge(
      renderingContext, 
      baseImage, 
      {
        content,
        width: width * 0.55,
        height: height * 0.55,
        x: width * 0.45,
        y: height * 0.45,
      }
    );
    const dataUrl = canvas.toDataURL('image/png');

    availableFavicons.forEach(icon => icon.setAttribute('href', dataUrl));
  };

  VuePrototype.prototype.$updateFaviconBadge = (badgeContent: string | number) => {
    if (baseImage.getAttribute('src') === href) {
      resolveAfterLoad(badgeContent);
    } else {
      baseImage.setAttribute('src', href);
      baseImage.onload = () => resolveAfterLoad(badgeContent);
    }
  };
};
