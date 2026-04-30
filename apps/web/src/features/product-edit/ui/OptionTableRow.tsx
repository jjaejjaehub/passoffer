'use client';

import { Checkbox, HStack, Table, Text } from "@chakra-ui/react";

interface OptionTableRowProps {
  id: string;
  firstColumn: string;
  secondColumn: string;
  price: number;
  optionCode: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function OptionTableRow({
  id,
  firstColumn,
  secondColumn,
  price,
  optionCode,
  checked,
  onCheckedChange,
}: OptionTableRowProps): React.JSX.Element {
  return (
    <Table.Row>
      <Table.Cell>
        <Checkbox.Root
          checked={checked}
          onCheckedChange={(event) => {
            onCheckedChange(event.checked === true);
          }}
        >
          <Checkbox.HiddenInput id={id} />
          <Checkbox.Control />
        </Checkbox.Root>
      </Table.Cell>
      <Table.Cell>
        <Text>{firstColumn}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text>{secondColumn}</Text>
      </Table.Cell>
      <Table.Cell textAlign="right">
        <HStack justify="flex-end">
          <Text>¥{price.toLocaleString("ja-JP")}</Text>
        </HStack>
      </Table.Cell>
      <Table.Cell>
        <Text>{optionCode.trim().length > 0 ? optionCode : "-"}</Text>
      </Table.Cell>
    </Table.Row>
  );
}
