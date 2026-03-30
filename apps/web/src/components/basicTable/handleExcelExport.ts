import * as XLSX from 'xlsx';

const CHILDREN_FIELD = 'children';

const flattenTreeData = <T extends Record<string, unknown>>(treeData: T[]): T[] => {
  const result: T[] = [];

  const flatten = (items: T[]) => {
    items.forEach(item => {
      result.push(item);
      const children = item[CHILDREN_FIELD] as T[] | undefined;
      if (children && children.length > 0) {
        flatten(children);
      }
    });
  };

  flatten(treeData);
  return result;
};

export const handleExport = (
  data: any,
  enableExpandable: boolean = false,
  exportFileName: string,
  columns: any = [],
) => {
  try {
    const exportData = enableExpandable ? flattenTreeData(data) : data;

    const excelData: any[][] = [];

    const headers: string[] = [];
    columns?.forEach((column: any) => {
      const title = (column as any).title;
      if (title && (column as any).dataIndex) {
        headers.push(title);
      }
    });
    excelData.push(headers);

    exportData.forEach((item: any) => {
      const row: any[] = [];
      columns?.forEach((column: any) => {
        const dataIndex = (column as any).dataIndex;
        const title = (column as any).title;

        if (dataIndex && title) {
          let value = item[dataIndex];

          if ((column as any).render) {
            try {
              const renderedValue = (column as any).render(value, item, 0);
              if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
                value = renderedValue;
              }
            } catch {
            }
          }

          row.push(value !== null && value !== undefined ? value : '');
        }
      });
      excelData.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    const headerStyle = {
      font: { bold: true, sz: 12 },
      fill: { fgColor: { rgb: 'F0F0F0' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    };

    const dataStyle = {
      border: {
        top: { style: 'thin', color: { rgb: 'E0E0E0' } },
        left: { style: 'thin', color: { rgb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
        right: { style: 'thin', color: { rgb: 'E0E0E0' } },
      },
    };

    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: headers[col], t: 's' };
        }
        worksheet[cellAddress].s = headerStyle;
      }

      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = dataStyle;
          }
        }
      }

      const colWidths: number[] = [];
      const maxColumnWidth = 100; // Максимальная ширина в символах

      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 10; // Минимальная ширина

        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];

          if (cell && cell.v !== null && cell.v !== undefined) {
            const cellText = String(cell.v);
            let textWidth = 0;
            for (let i = 0; i < cellText.length; i++) {
              const char = cellText[i];
              if (/[A-ZА-Я0-9]/.test(char)) {
                textWidth += 1.2;
              } else if (/[a-zа-я]/.test(char)) {
                textWidth += 1.0;
              } else {
                textWidth += 0.8;
              }
            }

            if (row === 0) {
              textWidth *= 1.3;
            }

            if (textWidth > maxWidth) {
              maxWidth = textWidth;
            }
          }
        }

        colWidths.push(Math.min(maxWidth + 3, maxColumnWidth));
      }

      worksheet['!cols'] = colWidths.map(width => ({
        width,
        wpx: width * 8, // Примерная конвертация в пиксели
      }));
    }

    worksheet['!pageSetup'] = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    if (worksheet['!ref']) {
      worksheet['!autofilter'] = {
        ref: worksheet['!ref'],
      };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    const fileName = `${exportFileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Ошибка при выгрузке в Excel:', error);
  }
};
