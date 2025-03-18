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
