import { AspectRatio, Badge, Card, CardBody, Image, Text, VStack } from '@chakra-ui/react'
import { FC } from 'react'
import { resolveProductImageUrl } from '../../routes/resources'

interface ProductCardProps {
  product: any
}

/* Deliberately shows only the essentials — name, price, active status — everything
   else (description, SKU, full xp, inventory, etc.) lives on the product's own page,
   one click away. */
const ProductCard: FC<ProductCardProps> = ({ product }) => {
  const imageUrl = resolveProductImageUrl(product)
  const price = product?.xp?.Price ?? product?.xp?.price
  const currency = product?.xp?.PriceCurrency ?? product?.xp?.priceCurrency ?? ''

  return (
    <Card
      variant="outline"
      h="full"
      cursor="pointer"
      transition="box-shadow 0.15s ease"
      _hover={{ shadow: 'md' }}
    >
      <AspectRatio ratio={1}>
        <Image
          src={imageUrl}
          alt={product?.Name ?? product?.ID}
          objectFit="cover"
          fallback={
            <VStack bg="chakra-subtle-bg" h="full" justify="center">
              <Text fontSize="xs" color="chakra-subtle-text">
                No image
              </Text>
            </VStack>
          }
        />
      </AspectRatio>
      <CardBody>
        <VStack align="stretch" spacing={1}>
          <Badge
            alignSelf="flex-start"
            colorScheme={product?.Active ? 'green' : 'gray'}
          >
            {product?.Active ? 'Active' : 'Inactive'}
          </Badge>
          <Text fontWeight="semibold" noOfLines={2} title={product?.Name}>
            {product?.Name || product?.ID}
          </Text>
          {price !== undefined && (
            <Text fontSize="sm" color="chakra-subtle-text">
              {currency} {Number(price).toFixed(2)}
            </Text>
          )}
        </VStack>
      </CardBody>
    </Card>
  )
}

export default ProductCard
