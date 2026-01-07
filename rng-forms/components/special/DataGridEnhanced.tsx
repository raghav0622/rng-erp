'use client';

import { ActionIcon, Badge, Box, Button, Group, Menu, Stack, Text, TextInput } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconDownload, IconSearch, IconX } from '@tabler/icons-react';
import { DataTable, type DataTableColumn } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

interface DataGridEnhancedProps<TValues extends FieldValues, TRecord = any> {
  name: Path<TValues>;
  control: Control<TValues>;
  columns: DataTableColumn<TRecord>[];

  // Enhanced features
  enableSearch?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  enableExport?: boolean;
  enablePagination?: boolean;

  // Search options
  searchPlaceholder?: string;
  searchableFields?: string[];

  // Pagination
  pageSize?: number;

  // Export options
  exportFileName?: string;
  exportFormat?: 'csv' | 'json';

  // Callbacks
  onRowClick?: (record: TRecord) => void;
  onSelectionChange?: (selectedRecords: TRecord[]) => void;
}

export default function DataGridEnhanced<TValues extends FieldValues, TRecord = any>(
  props: DataGridEnhancedProps<TValues, TRecord>,
) {
  const {
    name,
    control,
    columns,
    enableSearch = true,
    enableFiltering = false,
    enableSorting = true,
    enableExport = true,
    enablePagination = true,
    searchPlaceholder = 'Search...',
    searchableFields,
    pageSize: defaultPageSize = 10,
    exportFileName = 'data',
    exportFormat = 'csv',
    onRowClick,
    onSelectionChange,
  } = props;

  const { field } = useController({ name, control });
  const allRecords: TRecord[] = useMemo(() => field.value || [], [field.value]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedRecords, setSelectedRecords] = useState<TRecord[]>([]);

  // Search functionality
  const filteredRecords = useMemo(() => {
    if (!searchQuery || !enableSearch) return allRecords;

    const query = searchQuery.toLowerCase();
    return allRecords.filter((record: any) => {
      const fieldsToSearch = searchableFields || Object.keys(record);
      return fieldsToSearch.some((field) => {
        const value = record[field];
        return value?.toString().toLowerCase().includes(query);
      });
    });
  }, [allRecords, searchQuery, enableSearch, searchableFields]);

  // Sorting functionality
  const sortedRecords = useMemo(() => {
    if (!sortColumn || !enableSorting) return filteredRecords;

    return [...filteredRecords].sort((a: any, b: any) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRecords, sortColumn, sortDirection, enableSorting]);

  // Pagination
  const paginatedRecords = useMemo(() => {
    if (!enablePagination) return sortedRecords;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedRecords.slice(start, end);
  }, [sortedRecords, page, pageSize, enablePagination]);

  const handleSort = (_column: string) => {
    // Sorting is handled through DataTable component
  };

  const handleExport = () => {
    const dataToExport = selectedRecords.length > 0 ? selectedRecords : sortedRecords;

    if (exportFormat === 'csv') {
      exportToCSV(dataToExport);
    } else {
      exportToJSON(dataToExport);
    }
  };

  const exportToCSV = (data: TRecord[]) => {
    // Export is handled through Menu items
    const headers = columns.map((col) => col.accessor as string).filter(Boolean);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    data.forEach((record: any) => {
      const values = headers.map((header) => {
        const value = record[header];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, `${exportFileName}.csv`);
  };

  const exportToJSON = (data: TRecord[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    downloadBlob(blob, `${exportFileName}.json`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectionChange = (newSelection: TRecord[]) => {
    setSelectedRecords(newSelection);
    onSelectionChange?.(newSelection);
  };

  // Enhance columns with sorting indicators
  const enhancedColumns: DataTableColumn<TRecord>[] = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      sortable: enableSorting,
      titleStyle: { cursor: enableSorting ? 'pointer' : 'default' },
      render: col.render,
      title: (
        <Group gap={4}>
          <Text size="sm" fw={600}>
            {col.title}
          </Text>
          {enableSorting && sortColumn === col.accessor && (
            <Box>
              {sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
            </Box>
          )}
        </Group>
      ),
    }));
  }, [columns, enableSorting, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="sm">
          {enableSearch && (
            <TextInput
              placeholder={searchPlaceholder}
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.currentTarget.value);
                setPage(1); // Reset to first page on search
              }}
              rightSection={
                searchQuery ? (
                  <ActionIcon size="xs" variant="transparent" onClick={() => setSearchQuery('')}>
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              style={{ width: 300 }}
            />
          )}

          {selectedRecords.length > 0 && (
            <Badge color="blue">{selectedRecords.length} selected</Badge>
          )}
        </Group>

        <Group gap="xs">
          {enableSorting && sortColumn && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={() => {
                setSortColumn(null);
                setSortDirection('asc');
              }}
            >
              Clear Sort
            </Button>
          )}

          {enableExport && (
            <Menu>
              <Menu.Target>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconDownload size={16} />}
                  disabled={sortedRecords.length === 0}
                >
                  Export
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Export Format</Menu.Label>
                <Menu.Item
                  leftSection={<IconDownload size={14} />}
                  onClick={() =>
                    exportToCSV(selectedRecords.length > 0 ? selectedRecords : sortedRecords)
                  }
                >
                  Export to CSV
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconDownload size={14} />}
                  onClick={() =>
                    exportToJSON(selectedRecords.length > 0 ? selectedRecords : sortedRecords)
                  }
                >
                  Export to JSON
                </Menu.Item>
                {selectedRecords.length > 0 && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>Selection</Menu.Label>
                    <Menu.Item>Export {selectedRecords.length} selected rows</Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      <DataTable
        columns={enhancedColumns}
        records={paginatedRecords}
        onRowClick={onRowClick ? ({ record }) => onRowClick(record) : undefined}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={handleSelectionChange}
        withTableBorder
        withColumnBorders
        striped
        highlightOnHover
        minHeight={150}
        noRecordsText="No records found"
        // Pagination props
        page={enablePagination ? page : 1}
        onPageChange={enablePagination ? setPage : () => {}}
        totalRecords={enablePagination ? sortedRecords.length : paginatedRecords.length}
        recordsPerPage={enablePagination ? pageSize : paginatedRecords.length}
        recordsPerPageOptions={enablePagination ? [5, 10, 20, 50] : []}
        onRecordsPerPageChange={enablePagination ? setPageSize : () => {}}
      />

      {enablePagination && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {Math.min((page - 1) * pageSize + 1, sortedRecords.length)} to{' '}
            {Math.min(page * pageSize, sortedRecords.length)} of {sortedRecords.length} records
          </Text>
          {searchQuery && (
            <Text size="sm" c="dimmed">
              (filtered from {allRecords.length} total)
            </Text>
          )}
        </Group>
      )}
    </Stack>
  );
}
