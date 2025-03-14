import { Devvit } from '@devvit/public-api'
interface ChronleLogoProps {
  size?: number
  fill?: string
  width?: number
  darkColor?: string
  lightColor?: string
}

export const ChronleLogo = ({
  size = 2,
  width = 100,
  darkColor = '#FFF1E6',
  lightColor = '#1B1917',
}: ChronleLogoProps) => {
  const height = width / 5.575
  const scaledHeight: Devvit.Blocks.SizeString = `${height * size}px`
  const scaledWidth: Devvit.Blocks.SizeString = `${width * size}px`

  return (
    <vstack alignment="center middle" gap="small">
      {/* <image
        imageHeight={height}
        imageWidth={width}
        height={scaledHeight}
        width={scaledWidth}
        description="Chronle Logo"
        resizeMode="fill"
        url={`data:image/svg+xml;charset=UTF-8,
    <svg width="${width}" height="${height}" viewBox="0 0 35.707 6.445" xmlns="http://www.w3.org/2000/svg">
    <style>
        path {
            fill: ${lightColor};
        }
        @media (prefers-color-scheme: dark) {
            path { fill: rgb(255, 215, 189); }
        }
    </style>
    <g id="svgGroup" stroke-linecap="round" fill-rule="evenodd" font-size="9pt" stroke="currentColor" stroke-width="0.25mm" fill="currentColor" style="stroke:currentColor;stroke-width:0.25mm;fill:currentColor"><path d="M 4.535 0.734 L 4.734 0.113 L 5.809 0.113 L 5.809 2.699 L 4.383 2.699 A 3.544 3.544 0 0 0 4.353 2.353 Q 4.286 1.878 4.088 1.664 A 0.875 0.875 0 0 0 3.49 1.382 A 1.197 1.197 0 0 0 3.398 1.379 A 1.055 1.055 0 0 0 2.814 1.555 A 1.076 1.076 0 0 0 2.531 1.827 A 1.523 1.523 0 0 0 2.377 2.094 A 1.656 1.656 0 0 0 2.266 2.436 Q 2.232 2.599 2.219 2.787 A 3.437 3.437 0 0 0 2.211 3.023 Q 2.211 3.859 2.647 4.303 A 1.423 1.423 0 0 0 3.324 4.682 Q 3.549 4.74 3.816 4.746 A 2.742 2.742 0 0 0 3.871 4.746 Q 4.336 4.746 4.781 4.59 A 2.599 2.599 0 0 0 5.561 4.149 A 2.953 2.953 0 0 0 5.609 4.109 L 5.715 4.156 L 5.715 5.805 A 2.88 2.88 0 0 1 4.98 6.19 A 3.531 3.531 0 0 1 4.647 6.291 A 5.096 5.096 0 0 1 3.781 6.433 A 4.461 4.461 0 0 1 3.453 6.445 A 4.64 4.64 0 0 1 2.552 6.362 A 3.435 3.435 0 0 1 1.619 6.039 A 2.866 2.866 0 0 1 0.422 4.879 Q 0 4.125 0 3.086 Q 0 2.34 0.221 1.766 A 2.971 2.971 0 0 1 0.552 1.133 A 2.556 2.556 0 0 1 0.83 0.797 A 2.589 2.589 0 0 1 1.723 0.201 A 2.86 2.86 0 0 1 2.793 0 A 3.161 3.161 0 0 1 3.282 0.036 Q 3.576 0.082 3.82 0.188 Q 4.254 0.375 4.535 0.734 Z" id="0" vector-effect="non-scaling-stroke"/><path d="M 9.125 6.332 L 6.332 6.332 L 6.332 5.16 L 6.898 5.16 L 6.898 1.535 L 6.332 1.535 L 6.332 0.469 L 8.773 0.238 L 8.773 2.582 A 1.722 1.722 0 0 1 9.747 2.102 A 2.416 2.416 0 0 1 10.121 2.074 A 1.976 1.976 0 0 1 10.508 2.11 Q 10.73 2.154 10.9 2.254 A 0.975 0.975 0 0 1 11.158 2.475 Q 11.4 2.767 11.464 3.276 A 3.197 3.197 0 0 1 11.488 3.68 L 11.488 5.16 L 12.035 5.16 L 12.035 6.332 L 9.613 6.332 L 9.613 3.68 A 0.833 0.833 0 0 0 9.606 3.562 Q 9.597 3.502 9.579 3.454 A 0.309 0.309 0 0 0 9.516 3.35 A 0.325 0.325 0 0 0 9.309 3.249 A 0.452 0.452 0 0 0 9.258 3.246 A 0.48 0.48 0 0 0 9.068 3.287 A 0.617 0.617 0 0 0 8.994 3.324 A 0.672 0.672 0 0 0 8.791 3.514 A 0.788 0.788 0 0 0 8.773 3.539 L 8.773 5.16 L 9.125 5.16 L 9.125 6.332 Z" id="1" vector-effect="non-scaling-stroke"/><path d="M 15.852 6.332 L 12.512 6.332 L 12.512 5.16 L 13.078 5.16 L 13.078 3.367 L 12.512 3.367 L 12.512 2.301 L 14.914 2.07 L 14.914 2.871 Q 15.145 2.445 15.551 2.25 A 2.136 2.136 0 0 1 15.912 2.113 A 1.574 1.574 0 0 1 16.328 2.055 L 16.328 3.734 A 2.453 2.453 0 0 0 16.032 3.652 Q 15.872 3.618 15.726 3.614 A 1.449 1.449 0 0 0 15.684 3.613 A 1.251 1.251 0 0 0 15.425 3.641 A 1.566 1.566 0 0 0 15.273 3.682 Q 15.059 3.75 14.953 3.867 L 14.953 5.16 L 15.852 5.16 L 15.852 6.332 Z" id="2" vector-effect="non-scaling-stroke"/><path d="M 17.721 6.141 A 2.167 2.167 0 0 0 17.73 6.145 Q 18.26 6.402 18.988 6.402 Q 19.315 6.402 19.602 6.35 A 2.474 2.474 0 0 0 20.256 6.141 A 2.278 2.278 0 0 0 20.273 6.132 A 1.899 1.899 0 0 0 21.076 5.395 A 1.983 1.983 0 0 0 21.304 4.81 A 2.61 2.61 0 0 0 21.363 4.242 A 2.709 2.709 0 0 0 21.323 3.765 A 2.015 2.015 0 0 0 21.076 3.086 Q 20.789 2.602 20.256 2.338 A 2.186 2.186 0 0 0 20.251 2.336 Q 19.953 2.189 19.592 2.125 A 3.438 3.438 0 0 0 18.988 2.074 Q 18.254 2.074 17.721 2.338 A 2.283 2.283 0 0 0 17.688 2.355 A 1.907 1.907 0 0 0 16.9 3.086 A 1.988 1.988 0 0 0 16.668 3.69 A 2.647 2.647 0 0 0 16.613 4.242 A 2.7 2.7 0 0 0 16.65 4.699 A 2.021 2.021 0 0 0 16.9 5.395 A 1.874 1.874 0 0 0 17.095 5.666 A 1.952 1.952 0 0 0 17.721 6.141 Z M 19.509 4.451 A 3.383 3.383 0 0 0 19.516 4.238 Q 19.516 3.625 19.328 3.378 A 0.405 0.405 0 0 0 18.988 3.211 Q 18.519 3.211 18.467 4.025 A 3.383 3.383 0 0 0 18.461 4.238 Q 18.461 4.852 18.649 5.099 A 0.405 0.405 0 0 0 18.988 5.266 Q 19.458 5.266 19.509 4.451 Z" id="3" vector-effect="non-scaling-stroke"/><path d="M 24.656 6.332 L 21.863 6.332 L 21.863 5.16 L 22.43 5.16 L 22.43 3.367 L 21.863 3.367 L 21.863 2.301 L 24.266 2.07 L 24.266 2.602 A 1.563 1.563 0 0 1 24.718 2.275 A 1.891 1.891 0 0 1 24.871 2.209 A 2.144 2.144 0 0 1 25.562 2.072 A 2.467 2.467 0 0 1 25.652 2.07 A 1.976 1.976 0 0 1 26.039 2.106 Q 26.261 2.15 26.431 2.25 A 0.975 0.975 0 0 1 26.689 2.471 Q 26.931 2.763 26.996 3.272 A 3.197 3.197 0 0 1 27.02 3.676 L 27.02 5.16 L 27.566 5.16 L 27.566 6.332 L 25.145 6.332 L 25.145 3.676 A 0.833 0.833 0 0 0 25.137 3.558 Q 25.128 3.498 25.11 3.45 A 0.309 0.309 0 0 0 25.047 3.346 A 0.325 0.325 0 0 0 24.84 3.245 A 0.452 0.452 0 0 0 24.789 3.242 A 0.48 0.48 0 0 0 24.599 3.283 A 0.617 0.617 0 0 0 24.525 3.32 A 0.672 0.672 0 0 0 24.322 3.51 A 0.788 0.788 0 0 0 24.305 3.535 L 24.305 5.16 L 24.656 5.16 L 24.656 6.332 Z" id="4" vector-effect="non-scaling-stroke"/><path d="M 30.961 6.332 L 27.875 6.332 L 27.875 5.16 L 28.481 5.16 L 28.481 1.559 L 27.875 1.559 L 27.875 0.492 L 30.356 0.238 L 30.356 5.16 L 30.961 5.16 L 30.961 6.332 Z" id="5" vector-effect="non-scaling-stroke"/><path d="M 35.668 4.484 L 33.156 4.484 A 0.994 0.994 0 0 0 33.231 4.737 A 0.702 0.702 0 0 0 33.518 5.057 A 1.211 1.211 0 0 0 33.891 5.197 Q 34.042 5.228 34.215 5.23 A 2.059 2.059 0 0 0 34.238 5.231 A 1.873 1.873 0 0 0 34.924 5.104 A 2.191 2.191 0 0 0 35.238 4.953 A 1.705 1.705 0 0 0 35.477 4.785 L 35.582 4.832 L 35.582 5.953 A 1.51 1.51 0 0 1 35.404 6.057 Q 35.312 6.104 35.201 6.146 A 2.959 2.959 0 0 1 35.098 6.184 A 3.893 3.893 0 0 1 34.666 6.303 A 4.609 4.609 0 0 1 34.455 6.344 Q 34.109 6.402 33.77 6.402 Q 32.86 6.402 32.259 6.043 A 2.034 2.034 0 0 1 31.951 5.818 A 1.914 1.914 0 0 1 31.332 4.674 A 2.798 2.798 0 0 1 31.293 4.199 Q 31.293 3.547 31.58 3.07 A 1.927 1.927 0 0 1 32.383 2.334 A 2.392 2.392 0 0 1 33.093 2.111 A 3.153 3.153 0 0 1 33.582 2.074 Q 34.226 2.074 34.692 2.301 A 1.893 1.893 0 0 1 34.727 2.318 Q 35.203 2.563 35.455 2.998 A 1.875 1.875 0 0 1 35.691 3.723 A 2.37 2.37 0 0 1 35.707 4.004 A 2.745 2.745 0 0 1 35.699 4.221 A 2.464 2.464 0 0 1 35.695 4.26 A 4.526 4.526 0 0 1 35.683 4.377 A 3.431 3.431 0 0 1 35.668 4.484 Z M 33.141 3.805 L 34.227 3.805 Q 34.211 3.441 34.08 3.238 A 0.423 0.423 0 0 0 33.773 3.041 A 0.611 0.611 0 0 0 33.684 3.035 A 0.532 0.532 0 0 0 33.513 3.061 A 0.425 0.425 0 0 0 33.289 3.238 A 0.779 0.779 0 0 0 33.201 3.429 Q 33.172 3.519 33.157 3.627 A 1.803 1.803 0 0 0 33.141 3.805 Z" id="6" vector-effect="non-scaling-stroke"/></g></svg>
  `}
      /> */}
      <image
        url="chronle-logo.png"
        imageWidth={width}
        imageHeight={height}
        height={scaledHeight}
        width={scaledWidth}
      />
      <text
        size="xlarge"
        weight="bold"
        color={darkColor}
        darkColor={darkColor}
        lightColor={lightColor}
      >
        A game where you put items in order
      </text>
    </vstack>
  )
}
