/**
 * Ruang Vocabulary in /mydashboard: five new English words a day and five to review.
 * The word bank is written for a learner at A2 moving toward B1: common words a step
 * above the basics, each with its Indonesian meaning and one plain sentence. In a
 * sentence the word itself sits between asterisks. Words are handed out in this order,
 * five per day, and none appears twice.
 */

/** v verb, n noun, adj adjective, adv adverb. */
export type VocabPos = 'v' | 'n' | 'adj' | 'adv';
export type VocabWord = { word: string; pos: VocabPos; meaning: string; sentence: string };

/** One day's session. `done` holds the words ticked off that day. */
export type VocabDay = { day: string; fresh: string[]; review: string[]; done: string[] };
export type VocabData = { today: string; days: VocabDay[] };

export const VOCAB_PER_DAY = 5;
export const VOCAB_LEVEL = { now: 'A2', next: 'B1' } as const;

const bank: [string, VocabPos, string, string][] = [
  ['borrow', 'v', 'meminjam', 'Can I *borrow* your pen for a minute?'],
  ['crowded', 'adj', 'ramai, penuh sesak', 'The train is very *crowded* in the morning.'],
  ['journey', 'n', 'perjalanan', 'The *journey* to Bandung takes three hours.'],
  ['almost', 'adv', 'hampir', 'I *almost* missed the bus today.'],
  ['improve', 'v', 'memperbaiki, meningkatkan', 'I read every day to *improve* my English.'],

  ['habit', 'n', 'kebiasaan', 'Running in the morning is a good *habit*.'],
  ['avoid', 'v', 'menghindari', 'I *avoid* coffee at night.'],
  ['nervous', 'adj', 'gugup', 'She feels *nervous* before the interview.'],
  ['recently', 'adv', 'baru-baru ini', 'I *recently* started a new project.'],
  ['schedule', 'n', 'jadwal', 'My *schedule* is full this week.'],

  ['decide', 'v', 'memutuskan', 'We need to *decide* where to eat.'],
  ['honest', 'adj', 'jujur', 'Please be *honest* with me.'],
  ['purpose', 'n', 'tujuan', 'What is the *purpose* of this meeting?'],
  ['explain', 'v', 'menjelaskan', 'Can you *explain* this word to me?'],
  ['instead', 'adv', 'sebagai gantinya', 'There is no tea, so I drink water *instead*.'],

  ['advice', 'n', 'nasihat, saran', 'My father gave me good *advice*.'],
  ['remind', 'v', 'mengingatkan', 'Please *remind* me to call her.'],
  ['patient', 'adj', 'sabar', 'A good teacher is *patient* with students.'],
  ['suddenly', 'adv', 'tiba-tiba', '*Suddenly*, the lights went off.'],
  ['mistake', 'n', 'kesalahan', 'I made a *mistake* in my report.'],

  ['prepare', 'v', 'mempersiapkan', 'I *prepare* my lunch every morning.'],
  ['distance', 'n', 'jarak', 'The *distance* from my house to the office is ten kilometres.'],
  ['proud', 'adj', 'bangga', 'My parents are *proud* of me.'],
  ['forget', 'v', 'lupa', 'Do not *forget* to lock the door.'],
  ['perhaps', 'adv', 'mungkin', '*Perhaps* we can meet tomorrow.'],

  ['opinion', 'n', 'pendapat', 'In my *opinion*, this design is better.'],
  ['compare', 'v', 'membandingkan', 'Let us *compare* the two prices.'],
  ['familiar', 'adj', 'akrab, sudah dikenal', 'Your face looks *familiar* to me.'],
  ['effort', 'n', 'usaha', 'Learning a language takes *effort*.'],
  ['rarely', 'adv', 'jarang', 'I *rarely* eat fast food.'],

  ['achieve', 'v', 'mencapai', 'She worked hard to *achieve* her goal.'],
  ['goal', 'n', 'tujuan, target', 'My *goal* is to run thirty kilometres.'],
  ['confident', 'adj', 'percaya diri', 'He is *confident* when he speaks English.'],
  ['arrive', 'v', 'tiba', 'We *arrive* at the airport at six.'],
  ['already', 'adv', 'sudah', 'I have *already* finished my homework.'],

  ['experience', 'n', 'pengalaman', 'She has four years of work *experience*.'],
  ['suggest', 'v', 'menyarankan', 'I *suggest* we take a short break.'],
  ['curious', 'adj', 'penasaran, ingin tahu', 'Children are *curious* about everything.'],
  ['challenge', 'n', 'tantangan', 'This task is a big *challenge* for me.'],
  ['quite', 'adv', 'cukup, agak', 'The film was *quite* long.'],

  ['increase', 'v', 'meningkat, menaikkan', 'Prices *increase* every year.'],
  ['reason', 'n', 'alasan', 'What is the *reason* for the delay?'],
  ['grateful', 'adj', 'bersyukur, berterima kasih', 'I am *grateful* for your help.'],
  ['promise', 'v', 'berjanji', 'I *promise* to come on time.'],
  ['finally', 'adv', 'akhirnya', 'We *finally* finished the project.'],

  ['skill', 'n', 'keterampilan', 'Cooking is a useful *skill*.'],
  ['notice', 'v', 'memperhatikan, menyadari', 'Did you *notice* her new haircut?'],
  ['ordinary', 'adj', 'biasa', 'It was an *ordinary* day at work.'],
  ['neighbour', 'n', 'tetangga', 'My *neighbour* has two cats.'],
  ['especially', 'adv', 'terutama', 'I love fruit, *especially* mangoes.'],

  ['reduce', 'v', 'mengurangi', 'We should *reduce* the use of plastic.'],
  ['amount', 'n', 'jumlah', 'A small *amount* of sugar is enough.'],
  ['brave', 'adj', 'berani', 'The *brave* boy saved the cat.'],
  ['invite', 'v', 'mengundang', 'They *invite* us to their wedding.'],
  ['nearly', 'adv', 'hampir', 'It is *nearly* midnight.'],

  ['environment', 'n', 'lingkungan', 'We must protect the *environment*.'],
  ['collect', 'v', 'mengumpulkan', 'He likes to *collect* old coins.'],
  ['available', 'adj', 'tersedia', 'Is this room *available* tonight?'],
  ['customer', 'n', 'pelanggan', 'The *customer* asked for a discount.'],
  ['carefully', 'adv', 'dengan hati-hati', 'Please read the question *carefully*.'],

  ['describe', 'v', 'menggambarkan, mendeskripsikan', 'Can you *describe* your hometown?'],
  ['knowledge', 'n', 'pengetahuan', 'Books give us *knowledge*.'],
  ['similar', 'adj', 'mirip', 'Our phones are very *similar*.'],
  ['share', 'v', 'berbagi', 'I *share* a room with my brother.'],
  ['mostly', 'adv', 'kebanyakan, sebagian besar', 'I *mostly* work from home.'],

  ['deadline', 'n', 'tenggat waktu', 'The *deadline* for this task is Friday.'],
  ['manage', 'v', 'mengelola, berhasil', 'She can *manage* a team of ten people.'],
  ['responsible', 'adj', 'bertanggung jawab', 'He is *responsible* for the website.'],
  ['result', 'n', 'hasil', 'The test *result* was very good.'],
  ['immediately', 'adv', 'segera', 'Call me *immediately* when you arrive.'],

  ['solve', 'v', 'menyelesaikan, memecahkan', 'We need to *solve* this problem today.'],
  ['solution', 'n', 'solusi', 'There is a simple *solution* to this bug.'],
  ['complex', 'adj', 'rumit', 'The rules of this game are *complex*.'],
  ['require', 'v', 'membutuhkan, mewajibkan', 'This job will *require* good English.'],
  ['currently', 'adv', 'saat ini', 'I am *currently* learning new words.'],

  ['opportunity', 'n', 'kesempatan', 'This is a great *opportunity* to learn.'],
  ['consider', 'v', 'mempertimbangkan', 'Please *consider* my idea.'],
  ['flexible', 'adj', 'fleksibel, luwes', 'My working hours are *flexible*.'],
  ['progress', 'n', 'kemajuan', 'You are making good *progress*.'],
  ['gradually', 'adv', 'secara bertahap', 'My running *gradually* gets better.'],

  ['support', 'v', 'mendukung', 'My friends always *support* me.'],
  ['attitude', 'n', 'sikap', 'She has a positive *attitude* at work.'],
  ['reliable', 'adj', 'dapat diandalkan', 'This old car is still *reliable*.'],
  ['complete', 'v', 'menyelesaikan', 'I must *complete* this form today.'],
  ['probably', 'adv', 'mungkin, barangkali', 'It will *probably* rain this afternoon.'],

  ['budget', 'n', 'anggaran', 'We have a small *budget* for the trip.'],
  ['afford', 'v', 'mampu membeli', 'I cannot *afford* a new laptop now.'],
  ['expensive', 'adj', 'mahal', 'This restaurant is too *expensive*.'],
  ['receipt', 'n', 'struk, tanda terima', 'Keep the *receipt* after you pay.'],
  ['exactly', 'adv', 'tepat, persis', 'The bus leaves at *exactly* seven.'],

  ['recommend', 'v', 'merekomendasikan', 'Can you *recommend* a good book?'],
  ['flavour', 'n', 'rasa', 'This ice cream has a mango *flavour*.'],
  ['delicious', 'adj', 'lezat', 'Your fried rice is *delicious*.'],
  ['order', 'v', 'memesan', 'I want to *order* a cup of tea.'],
  ['usually', 'adv', 'biasanya', 'I *usually* wake up at five.'],

  ['weather', 'n', 'cuaca', 'The *weather* is hot today.'],
  ['expect', 'v', 'mengharapkan, memperkirakan', 'We *expect* rain this evening.'],
  ['humid', 'adj', 'lembap', 'Jakarta is hot and *humid*.'],
  ['flood', 'n', 'banjir', 'The *flood* closed the main road.'],
  ['heavily', 'adv', 'dengan deras, berat', 'It rained *heavily* last night.'],

  ['attend', 'v', 'menghadiri', 'I will *attend* the meeting at nine.'],
  ['colleague', 'n', 'rekan kerja', 'My *colleague* helped me with the report.'],
  ['busy', 'adj', 'sibuk', 'I am *busy* until three o’clock.'],
  ['discuss', 'v', 'membahas', 'Let us *discuss* the plan tomorrow.'],
  ['briefly', 'adv', 'secara singkat', 'He spoke *briefly* about the new project.'],

  ['health', 'n', 'kesehatan', 'Sleep is important for your *health*.'],
  ['recover', 'v', 'pulih', 'It takes a week to *recover* from the flu.'],
  ['exhausted', 'adj', 'sangat lelah', 'I was *exhausted* after the long run.'],
  ['injury', 'n', 'cedera', 'He cannot play because of a knee *injury*.'],
  ['regularly', 'adv', 'secara teratur', 'She exercises *regularly*.'],

  ['explore', 'v', 'menjelajahi', 'We want to *explore* the old city.'],
  ['luggage', 'n', 'bagasi, koper', 'Put your *luggage* in the car.'],
  ['foreign', 'adj', 'asing', 'He speaks two *foreign* languages.'],
  ['book', 'v', 'memesan (tiket, kamar)', 'I need to *book* a hotel room.'],
  ['abroad', 'adv', 'di luar negeri', 'My sister studies *abroad*.'],

  ['memory', 'n', 'ingatan, kenangan', 'I have a happy *memory* of that day.'],
  ['recognize', 'v', 'mengenali', 'I did not *recognize* him with his glasses.'],
  ['ancient', 'adj', 'kuno', 'Borobudur is an *ancient* temple.'],
  ['culture', 'n', 'budaya', 'I want to learn about Japanese *culture*.'],
  ['originally', 'adv', 'awalnya, aslinya', 'My family is *originally* from Padang.'],

  ['create', 'v', 'membuat, menciptakan', 'I *create* websites for my clients.'],
  ['feature', 'n', 'fitur', 'This phone has a new camera *feature*.'],
  ['useful', 'adj', 'berguna', 'This app is very *useful* for students.'],
  ['update', 'v', 'memperbarui', 'Please *update* the app to the latest version.'],
  ['automatically', 'adv', 'secara otomatis', 'The door opens *automatically*.'],

  ['device', 'n', 'perangkat', 'Turn off your *device* during the flight.'],
  ['connect', 'v', 'menghubungkan', 'I cannot *connect* to the internet.'],
  ['wireless', 'adj', 'nirkabel', 'I use a *wireless* mouse.'],
  ['screen', 'n', 'layar', 'The *screen* of my phone is broken.'],
  ['properly', 'adv', 'dengan benar', 'The printer does not work *properly*.'],

  ['encourage', 'v', 'mendorong, menyemangati', 'Good teachers *encourage* their students.'],
  ['behaviour', 'n', 'perilaku', 'His *behaviour* in class is very good.'],
  ['polite', 'adj', 'sopan', 'It is *polite* to say thank you.'],
  ['apologize', 'v', 'meminta maaf', 'I want to *apologize* for being late.'],
  ['sincerely', 'adv', 'dengan tulus', 'I *sincerely* thank you for your help.'],

  ['relationship', 'n', 'hubungan', 'I have a good *relationship* with my boss.'],
  ['trust', 'v', 'memercayai', 'I *trust* my best friend.'],
  ['generous', 'adj', 'murah hati, dermawan', 'My uncle is a *generous* man.'],
  ['argument', 'n', 'pertengkaran, argumen', 'They had an *argument* about money.'],
  ['calmly', 'adv', 'dengan tenang', 'She answered the question *calmly*.'],

  ['earn', 'v', 'memperoleh, menghasilkan (uang)', 'He wants to *earn* more money.'],
  ['salary', 'n', 'gaji', 'My *salary* comes at the end of the month.'],
  ['wealthy', 'adj', 'kaya', 'He comes from a *wealthy* family.'],
  ['save', 'v', 'menabung, menyimpan', 'I *save* some money every month.'],
  ['monthly', 'adv', 'setiap bulan', 'I pay my rent *monthly*.'],

  ['traffic', 'n', 'lalu lintas', 'The *traffic* is terrible on Monday.'],
  ['delay', 'v', 'menunda', 'Heavy rain can *delay* the flight.'],
  ['narrow', 'adj', 'sempit', 'This street is too *narrow* for a bus.'],
  ['passenger', 'n', 'penumpang', 'Every *passenger* needs a ticket.'],
  ['slowly', 'adv', 'dengan lambat', 'Please speak *slowly*.'],

  ['protect', 'v', 'melindungi', 'A helmet will *protect* your head.'],
  ['safety', 'n', 'keselamatan', 'Your *safety* is the most important thing.'],
  ['dangerous', 'adj', 'berbahaya', 'It is *dangerous* to drive too fast.'],
  ['warn', 'v', 'memperingatkan', 'I must *warn* you about the dog.'],
  ['luckily', 'adv', 'untungnya', '*Luckily*, nobody was hurt.'],

  ['education', 'n', 'pendidikan', 'A good *education* opens many doors.'],
  ['graduate', 'v', 'lulus', 'I will *graduate* from university next year.'],
  ['difficult', 'adj', 'sulit', 'The exam was very *difficult*.'],
  ['subject', 'n', 'mata pelajaran, topik', 'Math was my favourite *subject* at school.'],
  ['easily', 'adv', 'dengan mudah', 'She learns new words *easily*.'],

  ['imagine', 'v', 'membayangkan', 'Can you *imagine* life without phones?'],
  ['dream', 'n', 'mimpi, impian', 'My *dream* is to visit Mecca.'],
  ['creative', 'adj', 'kreatif', 'She has many *creative* ideas.'],
  ['invent', 'v', 'menciptakan, menemukan', 'People *invent* new things every year.'],
  ['someday', 'adv', 'suatu hari nanti', '*Someday* I want to live near the sea.'],

  ['community', 'n', 'komunitas, masyarakat', 'I joined a running *community*.'],
  ['volunteer', 'v', 'menjadi sukarelawan', 'They *volunteer* at the mosque every Friday.'],
  ['local', 'adj', 'lokal, setempat', 'I buy vegetables at the *local* market.'],
  ['event', 'n', 'acara', 'The *event* starts at eight in the evening.'],
  ['together', 'adv', 'bersama-sama', 'We eat dinner *together* every night.'],

  ['complain', 'v', 'mengeluh', 'Customers *complain* about the slow service.'],
  ['quality', 'n', 'kualitas', 'This shop sells shoes of good *quality*.'],
  ['disappointed', 'adj', 'kecewa', 'I was *disappointed* with the food.'],
  ['replace', 'v', 'mengganti', 'I need to *replace* the battery.'],
  ['unfortunately', 'adv', 'sayangnya', '*Unfortunately*, the shop is closed.'],

  ['respect', 'v', 'menghormati', 'We must *respect* our parents.'],
  ['tradition', 'n', 'tradisi', 'Going home for Eid is a *tradition* in Indonesia.'],
  ['religious', 'adj', 'taat beragama, keagamaan', 'My grandmother is a *religious* woman.'],
  ['celebrate', 'v', 'merayakan', 'We *celebrate* my birthday in May.'],
  ['peacefully', 'adv', 'dengan damai', 'The baby sleeps *peacefully*.'],

  ['measure', 'v', 'mengukur', 'I *measure* my running distance with my watch.'],
  ['length', 'n', 'panjang', 'The *length* of the table is two metres.'],
  ['accurate', 'adj', 'akurat', 'This map is not *accurate*.'],
  ['estimate', 'v', 'memperkirakan', 'Can you *estimate* the cost?'],
  ['roughly', 'adv', 'kira-kira', 'The trip takes *roughly* two hours.'],

  ['appear', 'v', 'muncul, tampak', 'Stars *appear* in the sky at night.'],
  ['shape', 'n', 'bentuk', 'The cake has the *shape* of a heart.'],
  ['obvious', 'adj', 'jelas', 'The answer is *obvious*.'],
  ['disappear', 'v', 'menghilang', 'The sun will *disappear* behind the clouds.'],
  ['clearly', 'adv', 'dengan jelas', 'Please write your name *clearly*.'],
];

export const vocabBank: VocabWord[] = bank.map(([word, pos, meaning, sentence]) => ({ word, pos, meaning, sentence }));
export const vocabOf = new Map(vocabBank.map((w) => [w.word, w]));
