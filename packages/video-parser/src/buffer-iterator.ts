export class OffsetCounter {
	#offset: number;
	#discardedBytes: number;
	constructor(initial: number) {
		this.#offset = initial;
		this.#discardedBytes = 0;
	}

	increment(amount: number) {
		if (amount < 0) {
			throw new Error('Cannot increment by a negative amount: ' + amount);
		}

		this.#offset += amount;
	}

	getOffset(): number {
		return this.#offset;
	}

	getDiscardedOffset(): number {
		return this.#offset - this.#discardedBytes;
	}

	discardBytes(amount: number) {
		this.#discardedBytes += amount;
	}

	decrement(amount: number) {
		if (amount < 0) {
			throw new Error('Cannot decrement by a negative amount');
		}

		this.#offset -= amount;
	}
}

const isoBaseMediaMp4Pattern = Buffer.from('ftyp');
const webmPattern = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

const matchesPattern = (pattern: Buffer) => {
	return (data: Buffer) => {
		return pattern.every((value, index) => data[index] === value);
	};
};

const makeOffsetCounter = (): OffsetCounter => {
	return new OffsetCounter(0);
};

export const getArrayBufferIterator = (initialData: Uint8Array) => {
	let data = initialData;
	let view = new DataView(data.buffer);
	const counter = makeOffsetCounter();

	const getSlice = (amount: number) => {
		const value = data.slice(
			counter.getDiscardedOffset(),
			counter.getDiscardedOffset() + amount,
		);
		counter.increment(amount);

		return value;
	};

	const getUint8 = () => {
		const val = view.getUint8(counter.getDiscardedOffset());
		counter.increment(1);

		return val;
	};

	const getFourByteNumber = () => {
		return (
			(getUint8() << 24) | (getUint8() << 16) | (getUint8() << 8) | getUint8()
		);
	};

	const getUint32 = () => {
		const val = view.getUint32(counter.getDiscardedOffset());
		counter.increment(4);
		return val;
	};

	const addData = (newData: Uint8Array) => {
		const newArray = new Uint8Array(
			data.buffer.byteLength + newData.byteLength,
		);
		newArray.set(data);
		newArray.set(new Uint8Array(newData), data.byteLength);
		data = newArray;
		view = new DataView(data.buffer);
	};

	const byteLength = () => {
		return data.byteLength;
	};

	const bytesRemaining = () => {
		return data.byteLength - counter.getDiscardedOffset();
	};

	const isIsoBaseMedia = () => {
		return matchesPattern(isoBaseMediaMp4Pattern)(
			Buffer.from(data.subarray(4, 8)),
		);
	};

	const isWebm = () => {
		return matchesPattern(webmPattern)(Buffer.from(data.subarray(0, 4)));
	};

	const removeBytesRead = () => {
		const bytesToRemove = counter.getDiscardedOffset();
		counter.discardBytes(bytesToRemove);
		const newArray = new Uint8Array(data.buffer.byteLength - bytesToRemove);
		newArray.set(data.slice(bytesToRemove));
		data = newArray;
		view = new DataView(data.buffer);
	};

	return {
		addData,
		counter,
		byteLength,
		bytesRemaining,
		isIsoBaseMedia,
		discardFirstBytes: removeBytesRead,
		isWebm,
		discard: (length: number) => {
			counter.increment(length);
		},
		getFourByteNumber,
		getSlice,
		getAtom: () => {
			const atom = getSlice(4);
			return new TextDecoder().decode(atom);
		},
		getMatroskaSegmentId: () => {
			const first = getSlice(1);
			const firstOneString = `0x${Array.from(new Uint8Array(first))
				.map((b) => {
					return b.toString(16).padStart(2, '0');
				})
				.join('')}`;

			// Catch void block
			// https://www.matroska.org/technical/elements.html
			const knownIdsWithOneLength = [
				'0xec',
				'0xae',
				'0xd7',
				'0x9c',
				'0x86',
				'0x83',
				'0xe0',
				'0xb0',
				'0xba',
			];
			if (knownIdsWithOneLength.includes(firstOneString)) {
				return firstOneString;
			}

			const firstTwo = getSlice(1);

			const knownIdsWithTwoLength = [
				'0x4dbb',
				'0x53ac',
				'0xec01',
				'0x73c5',
				'0x53c0',
			];

			const firstTwoString = `${firstOneString}${Array.from(
				new Uint8Array(firstTwo),
			)
				.map((b) => {
					return b.toString(16).padStart(2, '0');
				})
				.join('')}`;

			if (knownIdsWithTwoLength.includes(firstTwoString)) {
				return firstTwoString;
			}

			const knownIdsWithThreeLength = [
				'0x4d808c',
				'0x57418c',
				'0x448988',
				'0x22b59c',
				'0x23e383',
			];

			const firstThree = getSlice(1);

			const firstThreeString = `${firstTwoString}${Array.from(
				new Uint8Array(firstThree),
			)
				.map((b) => {
					return b.toString(16).padStart(2, '0');
				})
				.join('')}`;

			if (knownIdsWithThreeLength.includes(firstThreeString)) {
				return firstThreeString;
			}

			const segmentId = getSlice(1);

			return `${firstThreeString}${Array.from(new Uint8Array(segmentId))
				.map((b) => {
					return b.toString(16).padStart(2, '0');
				})
				.join('')}`;
		},
		getVint: (bytes: number) => {
			const slice = getSlice(bytes);
			const d = [...Array.from(new Uint8Array(slice))];
			const totalLength = d[0];

			if (totalLength === 0) {
				return 0;
			}

			// Calculate the actual length of the data based on the first set bit
			let actualLength = 0;
			while (((totalLength >> (7 - actualLength)) & 0x01) === 0) {
				actualLength++;
			}

			actualLength += 1; // Include the first byte set as 1

			// Combine the numbers to form the integer value
			let value = 0;

			// Mask the first byte properly then start combining
			value = totalLength & (0xff >> actualLength);
			for (let i = 1; i < actualLength; i++) {
				value = (value << 8) | d[i];
			}

			return value;
		},
		getUint8,
		getEBML: () => {
			const val = getUint8();

			// https://darkcoding.net/software/reading-mediarecorders-webm-opus-output/#:~:text=The%20first%20four%20bytes%20(%201A,%E2%80%93%20read%20on%20for%20why).
			// You drop the initial 0 bits and the first 1 bit to get the value. 0x81 is 0b10000001, so there are zero inital 0 bits, meaning length one byte, and the value is 1. The 0x9F value for length of the EBML header we saw earlier is 0b10011111, still one byte, value is 0b0011111, which is 31 (the python repl is very helpful for these conversions).
			const actualValue = val & 0x7f; // 0x7F is binary 01111111, which masks out the first bit

			return actualValue;
		},
		getInt8: () => {
			const val = view.getInt8(counter.getDiscardedOffset());
			counter.increment(1);
			return val;
		},
		getUint16: () => {
			const val = view.getUint16(counter.getDiscardedOffset());
			counter.increment(2);
			return val;
		},
		getInt16: () => {
			const val = view.getInt16(counter.getDiscardedOffset());
			counter.increment(2);
			return val;
		},
		getUint32,
		// https://developer.apple.com/documentation/quicktime-file-format/sound_sample_description_version_1
		// A 32-bit unsigned fixed-point number (16.16) that indicates the rate at which the sound samples were obtained.
		getFixedPoint1616Number: () => {
			const val = getUint32();
			return val / 2 ** 16;
		},
		getPascalString: () => {
			const val = getSlice(32);
			return [...Array.from(new Uint8Array(val))];
		},
		getDecimalBytes(length: number): number {
			const bytes = getSlice(length);
			const numbers = [...Array.from(new Uint8Array(bytes))];
			return numbers.reduce(
				(acc, byte, index) =>
					acc + (byte << (8 * (numbers.length - index - 1))),
				0,
			);
		},
		getByteString(length: number): string {
			const bytes = getSlice(length);
			return new TextDecoder().decode(bytes).trim();
		},
		getFloat64: () => {
			const val = view.getFloat64(counter.getDiscardedOffset());
			counter.increment(8);
			return val;
		},
	};
};

export type BufferIterator = ReturnType<typeof getArrayBufferIterator>;
