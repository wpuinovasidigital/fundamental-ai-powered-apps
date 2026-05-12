import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getTransactions } from '@/features/transaction/action';
import { cn, convertToIDR } from '@/lib/utils';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Fragment } from 'react/jsx-runtime';

const TABLE_HEADER = [
  '#',
  'Date',
  'Description',
  'Category',
  'Amount',
  'Action',
];

export default function TransactionTable({
  transactions,
  isLoading,
  refetch,
  page,
  limit,
  search,
  setPage,
  setLimit,
  setSearch,
}: {
  transactions?: Awaited<ReturnType<typeof getTransactions>>;
  page: number;
  limit: number;
  search: string;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  isLoading: boolean;
  refetch: () => void;
}) {
  return (
    <Fragment>
      <Card className="w-full gap-2">
        <CardHeader className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div>
            <CardTitle>Recent Transaction</CardTitle>
            <CardDescription>Your latest financial activities.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {TABLE_HEADER.map((header) => (
                  <TableHead key={`th-${header}`}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading &&
                transactions?.data?.map((transaction, index) => (
                  <TableRow key={`tr-${transaction.id}`}>
                    <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell
                      className={cn(
                        'font-semibold',
                        transaction.type === 'expense'
                          ? 'text-destructive'
                          : 'text-green-500',
                      )}
                    >
                      {transaction.type === 'expense' && '-'}
                      {convertToIDR(transaction.amount)}
                    </TableCell>
                    <TableCell className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-yellow-500"
                        onClick={() => {}}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {}}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
            {isLoading && (
              <TableCaption className="mb-4">Loading...</TableCaption>
            )}
            {!isLoading && transactions?.data?.length === 0 && (
              <TableCaption className="mb-4">
                No transactions found
              </TableCaption>
            )}
          </Table>
        </CardContent>
      </Card>
    </Fragment>
  );
}
