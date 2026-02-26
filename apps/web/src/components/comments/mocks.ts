// import { PreparedComment } from '../../types/comments';

// export const mockComments: PreparedComment[] = [
//   {
//     id: 1,
//     entityType: 'project',
//     entityId: 123,
//     message: 'Это первый комментарий к проекту. Он содержит простой текст.',
//     html: '<p>Это первый комментарий к проекту. Он содержит простой текст.</p>',
//     mention_ids: [2, 3],
//     files: [
//       {
//         id: 1,
//         name: 'Техническое задание.docx',
//         url: 'https://example.com/files/tech_spec.docx',
//         size: 2457600, // 2.4 MB
//         mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       },
//       {
//         id: 2,
//         name: 'Диаграмма Ганта.png',
//         url: 'https://example.com/files/gantt.png',
//         size: 512000, // 500 KB
//         mime_type: 'image/png',
//       },
//     ],
//     user_id: 1,
//     created_at: '2024-01-15T10:30:00Z',
//     updated_at: '2024-01-15T10:30:00Z',
//     comments: [
//       {
//         id: 2,
//         entityType: 'project',
//         entityId: 123,
//         message: 'Спасибо за предоставленные документы! Второй файл особенно полезен.',
//         html: '<p>Спасибо за предоставленные документы! <strong>Второй файл особенно полезен.</strong></p>',
//         mention_ids: [1],
//         files: [],
//         user_id: 2,
//         created_at: '2024-01-15T11:15:00Z',
//         updated_at: '2024-01-15T11:15:00Z',
//         comments: [
//           {
//             id: 3,
//             entityType: 'project',
//             entityId: 123,
//             message: 'Рад, что помог! Если понадобится что-то ещё - обращайтесь.',
//             html: '<p>Рад, что помог! <em>Если понадобится что-то ещё - обращайтесь.</em></p>',
//             mention_ids: [],
//             files: [
//               {
//                 id: 3,
//                 name: 'Дополнительные материалы.zip',
//                 url: 'https://example.com/files/additional.zip',
//                 size: 10485760, // 10 MB
//                 mime_type: 'application/zip',
//               },
//             ],
//             user_id: 1,
//             created_at: '2024-01-15T12:00:00Z',
//             updated_at: '2024-01-15T14:30:00Z', // отредактирован
//             comments: [],
//           },
//           {
//             id: 4,
//             entityType: 'project',
//             entityId: 123,
//             message: 'У меня тоже есть несколько вопросов по этому проекту.',
//             html: '<p>У меня тоже есть несколько вопросов по этому проекту.</p>',
//             mention_ids: [1, 4],
//             files: [],
//             user_id: 3,
//             created_at: '2024-01-15T13:45:00Z',
//             updated_at: '2024-01-15T13:45:00Z',
//             comments: [],
//           },
//         ],
//       },
//       {
//         id: 5,
//         entityType: 'project',
//         entityId: 123,
//         message: 'Когда ожидается следующий этап работы?',
//         html: '<p>Когда ожидается <u>следующий этап работы</u>?</p>',
//         mention_ids: [1],
//         files: [],
//         user_id: 4,
//         created_at: '2024-01-16T09:20:00Z',
//         updated_at: '2024-01-16T09:20:00Z',
//         comments: [
//           {
//             id: 6,
//             entityType: 'project',
//             entityId: 123,
//             message: 'Планируем начать на следующей неделе. Подготовлю план.',
//             html: '<p>Планируем начать на следующей неделе. Подготовлю план.</p>',
//             mention_ids: [4],
//             files: [
//               {
//                 id: 4,
//                 name: 'План работ.pdf',
//                 url: 'https://example.com/files/plan.pdf',
//                 size: 1536000, // 1.5 MB
//                 mime_type: 'application/pdf',
//               },
//             ],
//             user_id: 1,
//             created_at: '2024-01-16T10:00:00Z',
//             updated_at: '2024-01-16T10:00:00Z',
//             comments: [],
//           },
//         ],
//       },
//     ],
//   },
//   {
//     id: 7,
//     entityType: 'project',
//     entityId: 123,
//     message: 'Отдельный комментарий без вложений и ответов.',
//     html: '<p>Отдельный комментарий без вложений и ответов.</p>',
//     mention_ids: [],
//     files: [],
//     user_id: 5,
//     created_at: '2024-01-17T14:00:00Z',
//     updated_at: '2024-01-17T14:00:00Z',
//     comments: [],
//   },
//   {
//     id: 8,
//     entityType: 'project',
//     entityId: 123,
//     message: 'Комментарий с большим количеством файлов разных типов.',
//     html: '<p>Комментарий с большим количеством файлов разных типов.</p>',
//     mention_ids: [1, 2, 3, 4],
//     files: [
//       {
//         id: 5,
//         name: 'Отчёт по анализу рынка.xlsx',
//         url: 'https://example.com/files/market_analysis.xlsx',
//         size: 5242880, // 5 MB
//         mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       },
//       {
//         id: 6,
//         name: 'Презентация проекта.pptx',
//         url: 'https://example.com/files/presentation.pptx',
//         size: 8388608, // 8 MB
//         mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
//       },
//       {
//         id: 7,
//         name: 'Логотип компании.svg',
//         url: 'https://example.com/files/logo.svg',
//         size: 102400, // 100 KB
//         mime_type: 'image/svg+xml',
//       },
//       {
//         id: 8,
//         name: 'Видео инструкция.mp4',
//         url: 'https://example.com/files/video.mp4',
//         size: 52428800, // 50 MB
//         mime_type: 'video/mp4',
//       },
//       {
//         id: 9,
//         name: 'README.txt',
//         url: 'https://example.com/files/readme.txt',
//         size: 5120, // 5 KB
//         mime_type: 'text/plain',
//       },
//     ],
//     user_id: 2,
//     created_at: '2024-01-18T16:30:00Z',
//     updated_at: '2024-01-18T16:30:00Z',
//     comments: [
//       {
//         id: 9,
//         entityType: 'project',
//         entityId: 123,
//         message: 'Спасибо за материалы! Видео особенно полезно.',
//         html: '<p>Спасибо за материалы! <mark>Видео особенно полезно.</mark></p>',
//         mention_ids: [2],
//         files: [],
//         user_id: 3,
//         created_at: '2024-01-18T17:15:00Z',
//         updated_at: '2024-01-18T17:15:00Z',
//         comments: [],
//       },
//     ],
//   },
// ];
