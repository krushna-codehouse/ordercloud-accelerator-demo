import {
  Badge,
  Box,
  Button,
  Checkbox,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Link as ChakraLink,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { InventoryRecords } from 'ordercloud-javascript-sdk'
import type { InventoryRecord } from 'ordercloud-javascript-sdk'
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TbArrowsSort, TbPlus, TbSearch, TbTrash } from 'react-icons/tb'
import { INVENTORY_LOCATIONS } from '../../config/inventoryLocations'

type SortKey = 'location' | 'quantity'

interface Row {
  location: { id: string; label: string }
  record?: InventoryRecord
}

function stockColorScheme(qty?: number) {
  if (qty === undefined || qty === null) return 'gray'
  if (qty <= 0) return 'red'
  if (qty <= 5) return 'yellow'
  return 'green'
}

function stockLabel(qty?: number) {
  if (qty === undefined || qty === null) return 'Not set up'
  if (qty <= 0) return 'Out of stock'
  if (qty <= 5) return `Low — ${qty}`
  return qty.toString()
}

const ProductInventoryPanel: FC = () => {
  const { productID } = useParams() as { productID: string }
  const toast = useToast()
  const deleteDisclosure = useDisclosure()

  const [records, setRecords] = useState<InventoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busyID, setBusyID] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<{ [recordID: string]: string }>({})
  const [newQuantities, setNewQuantities] = useState<{ [locationID: string]: string }>({})
  const [locationFilter, setLocationFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('location')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [pendingDelete, setPendingDelete] = useState<InventoryRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await InventoryRecords.List(productID, { pageSize: 100, includeAddress: true })
      setRecords(res.Items ?? [])
    } catch {
      toast({ title: 'Could not load inventory records', status: 'error' })
    } finally {
      setLoading(false)
    }
  }, [productID, toast])

  useEffect(() => {
    load()
  }, [load])

  const labelFor = useCallback(
    (record: InventoryRecord) =>
      INVENTORY_LOCATIONS.find((l) => l.id === record.AddressID)?.label ??
      record.Address?.AddressName ??
      record.AddressID ??
      'Unknown location',
    []
  )

  // One row per known location (whether or not it has a record yet), plus any
  // legacy/unexpected records against addresses outside the three known locations.
  const rows = useMemo<Row[]>(() => {
    const knownRows: Row[] = INVENTORY_LOCATIONS.map((location) => ({
      location,
      record: records.find((r) => r.AddressID === location.id),
    }))
    const extraRows: Row[] = records
      .filter((r) => !INVENTORY_LOCATIONS.some((l) => l.id === r.AddressID))
      .map((record) => ({
        location: { id: record.AddressID!, label: labelFor(record) },
        record,
      }))
    return [...knownRows, ...extraRows]
  }, [records, labelFor])

  const filteredRows = useMemo(() => {
    let result = rows
    if (locationFilter !== 'all') {
      result = result.filter((r) => r.location.id === locationFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((r) => r.location.label.toLowerCase().includes(q))
    }
    const sorted = [...result].sort((a, b) => {
      if (sortKey === 'quantity') {
        const aq = a.record?.QuantityAvailable ?? -1
        const bq = b.record?.QuantityAvailable ?? -1
        return aq - bq
      }
      return a.location.label.localeCompare(b.location.label)
    })
    return sortDir === 'asc' ? sorted : sorted.reverse()
  }, [rows, locationFilter, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleSaveQuantity = async (record: InventoryRecord) => {
    const draft = drafts[record.ID!]
    const qty = Number(draft)
    if (draft === undefined || Number.isNaN(qty) || qty < 0) {
      toast({ title: 'Enter a valid, non-negative quantity', status: 'error' })
      return
    }
    setBusyID(record.ID!)
    try {
      await InventoryRecords.Patch(productID, record.ID!, { QuantityAvailable: qty })
      toast({ title: `${labelFor(record)} quantity updated`, status: 'success' })
      await load()
    } catch {
      toast({ title: 'Could not update quantity', status: 'error' })
    } finally {
      setBusyID(null)
    }
  }

  const handleToggleOrderCanExceed = async (record: InventoryRecord, checked: boolean) => {
    setBusyID(record.ID!)
    try {
      await InventoryRecords.Patch(productID, record.ID!, { OrderCanExceed: checked })
      await load()
    } catch {
      toast({ title: 'Could not update setting', status: 'error' })
    } finally {
      setBusyID(null)
    }
  }

  const handleCreate = async (locationID: string) => {
    const raw = newQuantities[locationID]
    const qty = Number(raw)
    if (raw === undefined || Number.isNaN(qty) || qty < 0) {
      toast({ title: 'Enter a valid, non-negative quantity', status: 'error' })
      return
    }
    setBusyID(locationID)
    try {
      await InventoryRecords.Create(productID, {
        AddressID: locationID,
        QuantityAvailable: qty,
        OrderCanExceed: false,
      } as InventoryRecord)
      toast({ title: 'Location added', status: 'success' })
      setNewQuantities((prev) => ({ ...prev, [locationID]: '' }))
      await load()
    } catch {
      toast({ title: 'Could not add this location', status: 'error' })
    } finally {
      setBusyID(null)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete?.ID) return
    setBusyID(pendingDelete.ID)
    try {
      await InventoryRecords.Delete(productID, pendingDelete.ID)
      toast({ title: 'Removed', status: 'success' })
      await load()
    } catch {
      toast({ title: 'Could not remove', status: 'error' })
    } finally {
      setBusyID(null)
      setPendingDelete(null)
      deleteDisclosure.onClose()
    }
  }

  return (
    <Box p={4}>
      <HStack mb={4} flexWrap="wrap" gap={2}>
        <InputGroup w="280px" maxW="100%">
          <InputLeftElement pointerEvents="none">
            <Icon as={TbSearch} />
          </InputLeftElement>
          <Input
            pl={10}
            placeholder="Search by location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Select w="220px" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
          <option value="all">All locations</option>
          {INVENTORY_LOCATIONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>
      </HStack>

      {loading ? (
        <Spinner />
      ) : (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th cursor="pointer" onClick={() => toggleSort('location')}>
                <HStack spacing={1}>
                  <Text>Location</Text>
                  {sortKey === 'location' && <Icon as={TbArrowsSort} />}
                </HStack>
              </Th>
              <Th cursor="pointer" onClick={() => toggleSort('quantity')}>
                <HStack spacing={1}>
                  <Text>Status</Text>
                  {sortKey === 'quantity' && <Icon as={TbArrowsSort} />}
                </HStack>
              </Th>
              <Th>Quantity</Th>
              <Th>Order can exceed</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {filteredRows.map((row) => {
              const { location, record } = row
              const busy = busyID === (record?.ID ?? location.id)
              if (!record) {
                return (
                  <Tr key={location.id}>
                    <Td>
                      <Text fontWeight="medium">{location.label}</Text>
                    </Td>
                    <Td>
                      <Badge colorScheme="gray">Not set up</Badge>
                    </Td>
                    <Td colSpan={2}>
                      <HStack>
                        <Input
                          size="sm"
                          w="120px"
                          type="number"
                          min={0}
                          placeholder="Quantity"
                          value={newQuantities[location.id] ?? ''}
                          onChange={(e) =>
                            setNewQuantities((prev) => ({ ...prev, [location.id]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          leftIcon={<Icon as={TbPlus} />}
                          isLoading={busy}
                          onClick={() => handleCreate(location.id)}
                        >
                          Add
                        </Button>
                      </HStack>
                    </Td>
                    <Td />
                  </Tr>
                )
              }

              const draft = drafts[record.ID!] ?? record.QuantityAvailable?.toString() ?? ''
              const hasChange = draft !== (record.QuantityAvailable?.toString() ?? '')

              return (
                <Tr key={record.ID}>
                  <Td>
                    <Text fontWeight="medium">{location.label}</Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={stockColorScheme(record.QuantityAvailable)}>
                      {stockLabel(record.QuantityAvailable)}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack>
                      <Input
                        size="sm"
                        w="100px"
                        type="number"
                        min={0}
                        value={draft}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [record.ID!]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        isDisabled={!hasChange}
                        isLoading={busy}
                        onClick={() => handleSaveQuantity(record)}
                      >
                        Save
                      </Button>
                    </HStack>
                  </Td>
                  <Td>
                    <Checkbox
                      isChecked={!!record.OrderCanExceed}
                      isDisabled={busy}
                      onChange={(e) => handleToggleOrderCanExceed(record, e.target.checked)}
                    />
                  </Td>
                  <Td>
                    <HStack justify="flex-end">
                      <ChakraLink
                        as={Link}
                        to={`/products/${productID}/inventory-records/${record.ID}`}
                        fontSize="sm"
                        color="primary.500"
                      >
                        Advanced
                      </ChakraLink>
                      <IconButton
                        aria-label="Remove location"
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        icon={<Icon as={TbTrash} />}
                        isLoading={busy}
                        onClick={() => {
                          setPendingDelete(record)
                          deleteDisclosure.onOpen()
                        }}
                      />
                    </HStack>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      )}

      <Modal isOpen={deleteDisclosure.isOpen} onClose={deleteDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Remove this location's inventory tracking?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              This deletes the inventory record for{' '}
              <strong>{pendingDelete ? labelFor(pendingDelete) : ''}</strong> entirely — it won't
              just be reset to zero. This can't be undone.
            </Text>
          </ModalBody>
          <ModalFooter as={HStack}>
            <Button variant="ghost" onClick={deleteDisclosure.onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDelete}>
              Remove
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export default ProductInventoryPanel
